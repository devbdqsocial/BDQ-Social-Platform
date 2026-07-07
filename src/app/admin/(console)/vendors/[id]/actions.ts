"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/guard";
import { toResult } from "@/server/action";
import type { Result } from "@/lib/result";
import { OfflinePaymentError, recordOfflineStallPayment } from "@/server/payments/offline";
import {
  ContractNotSignedError,
  StallAlreadyBookedError,
  approveForPayment,
  logCallback,
  assignStallByAdmin,
  rejectVendor,
  setKycDocStatus,
  setUnderReview,
} from "@/server/vendors/admin-service";

function revalidate(id: string) {
  revalidatePath(`/admin/vendors/${id}`);
  revalidatePath("/admin/vendors");
}

export async function underReviewAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requirePermission("VENDOR_MANAGE");
    const id = String(formData.get("id"));
    await setUnderReview(session, id);
    revalidate(id);
  });
}

export async function assignStallAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requirePermission("VENDOR_MANAGE");
    const id = String(formData.get("id"));
    const stallId = String(formData.get("stallId"));
    if (!stallId) throw new Error("Select a stall to assign");
    try {
      await assignStallByAdmin(session, id, stallId);
    } catch (e) {
      if (e instanceof StallAlreadyBookedError) throw new Error("That stall is already booked.");
      throw e;
    }
    revalidate(id);
  });
}

/** Approve-before-pay: confirm the reserved stall and open it for vendor payment. */
export async function approveForPaymentAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requirePermission("VENDOR_MANAGE");
    const id = String(formData.get("id"));
    try {
      await approveForPayment(session, id);
    } catch (e) {
      if (e instanceof ContractNotSignedError) throw new Error("This vendor hasn't signed the agreement yet.");
      throw e;
    }
    revalidate(id);
  });
}

export async function logCallbackAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requirePermission("VENDOR_MANAGE");
    const id = String(formData.get("id"));
    const note = String(formData.get("note") ?? "");
    await logCallback(session, id, note);
    revalidate(id);
  });
}

export async function recordOfflinePaymentAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requirePermission("VENDOR_MANAGE");
    const id = String(formData.get("id"));
    const bookingId = String(formData.get("bookingId"));
    const amountPaise = Number(formData.get("amountPaise"));
    const gatewayRef = String(formData.get("gatewayRef") ?? "");
    const note = String(formData.get("note") ?? "");
    try {
      await recordOfflineStallPayment(session, { bookingId, amountPaise, gatewayRef, note });
    } catch (e) {
      if (e instanceof OfflinePaymentError) {
        if (e.code === "REFERENCE_REQUIRED") throw new Error("Payment reference is required.");
        if (e.code === "NOTE_REQUIRED") throw new Error("Payment note is required.");
        if (e.code === "AMOUNT_MISMATCH") throw new Error("Payment amount must match the stall price.");
        if (e.code === "DUPLICATE_REFERENCE") throw new Error("This payment reference is already recorded.");
        if (e.code === "BOOKING_NOT_PENDING") throw new Error("Only pending-payment bookings can be marked paid offline.");
      }
      throw e;
    }
    revalidate(id);
  });
}

export async function setKycDocStatusAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requirePermission("VENDOR_MANAGE");
    const id = String(formData.get("id"));
    const docType = String(formData.get("docType"));
    const status = String(formData.get("status"));
    if (status !== "VERIFIED" && status !== "REJECTED" && status !== "PENDING") throw new Error("Invalid status");
    await setKycDocStatus(session, id, docType, status);
    revalidate(id);
    revalidatePath("/vendor/documents");
  });
}

export async function rejectAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requirePermission("VENDOR_MANAGE");
    const id = String(formData.get("id"));
    await rejectVendor(session, id);
    revalidate(id);
  });
}
