"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { db } from "@/server/db";
import { reserveStall, cancelReservation, StallUnavailableError } from "@/server/bookings/service";
import { createStallPaymentOrder } from "@/server/bookings/payment";
import { signBookingAgreement } from "@/server/bookings/agreement";
import { generateAndSignContract } from "@/server/contracts/sign";
import { contractSignSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

async function vendorCtx() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) throw new Error("Create your brand profile first");
  return { session, profile };
}

export async function reserveStallAction(
  eventId: string,
  stallId: string,
): Promise<{ ok: boolean; bookingId?: string; error?: string }> {
  const { session, profile } = await vendorCtx();
  try {
    const b = await reserveStall(profile.id, session.userId, eventId, stallId);
    revalidatePath("/vendor/onboarding");
    revalidatePath("/vendor/dashboard");
    revalidatePath(`/vendor/events/${eventId}`);
    return { ok: true, bookingId: b.id };
  } catch (e) {
    if (e instanceof StallUnavailableError) return { ok: false, error: "That stall was just taken — pick another." };
    return { ok: false, error: e instanceof Error ? e.message : "Could not reserve the stall" };
  }
}

export async function cancelReservationAction(bookingId: string): Promise<void> {
  const { profile } = await vendorCtx();
  await cancelReservation(profile.id, bookingId);
  revalidatePath("/vendor/onboarding");
  revalidatePath("/vendor/dashboard");
}

export async function signContractAction(
  formData: FormData,
): Promise<{ ok: boolean; url?: string | null; error?: string }> {
  const { session, profile } = await vendorCtx();
  let parsed;
  try {
    parsed = parseOrThrow(contractSignSchema, { signerName: formData.get("signerName"), agree: formData.get("agree") });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Please type your name and agree." };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  try {
    const { url } = await generateAndSignContract(session, profile.id, parsed.signerName, ip);
    revalidatePath("/vendor/onboarding");
    revalidatePath("/vendor/dashboard");
    revalidatePath("/vendor/documents");
    return { ok: true, url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not sign the contract" };
  }
}

export async function signBookingAgreementAction(
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  const { session, profile } = await vendorCtx();
  let parsed;
  try {
    parsed = parseOrThrow(contractSignSchema, { signerName: formData.get("signerName"), agree: formData.get("agree") });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Please type your name and agree." };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  try {
    await signBookingAgreement(session, profile.id, String(formData.get("bookingId")), { signerName: parsed.signerName, signerIp: ip });
    revalidatePath("/vendor/home");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not sign the agreement" };
  }
}

/** Post-payment poll target: fulfilment is webhook-driven, so the client waits for BOOKED. */
export async function getBookingStatusAction(bookingId: string): Promise<{ status: string | null }> {
  const { profile } = await vendorCtx();
  const b = await db.booking.findFirst({ where: { id: bookingId, vendorProfileId: profile.id }, select: { status: true } });
  return { status: b?.status ?? null };
}

export async function payStallAction(
  bookingId: string,
): Promise<{ ok: boolean; razorpayOrderId?: string; amountPaise?: number; keyId?: string; error?: string }> {
  const { profile } = await vendorCtx();
  try {
    const order = await createStallPaymentOrder(profile.id, bookingId);
    return { ok: true, ...order };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not start payment" };
  }
}
