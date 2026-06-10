"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/guard";
import {
  ContractNotSignedError,
  StallAlreadyBookedError,
  approveVendor,
  approveForPayment,
  logCallback,
  assignStallByAdmin,
  rejectVendor,
  setUnderReview,
} from "@/server/vendors/admin-service";

function revalidate(id: string) {
  revalidatePath(`/admin/vendors/${id}`);
  revalidatePath("/admin/vendors");
}

export async function underReviewAction(formData: FormData): Promise<void> {
  const session = await requirePermission("VENDOR_MANAGE");
  const id = String(formData.get("id"));
  await setUnderReview(session, id);
  revalidate(id);
}

export async function approveAction(formData: FormData): Promise<void> {
  const session = await requirePermission("VENDOR_MANAGE");
  const id = String(formData.get("id"));
  const stallId = String(formData.get("stallId"));
  if (!stallId) throw new Error("Select a stall to assign");
  try {
    await approveVendor(session, id, stallId);
  } catch (e) {
    if (e instanceof StallAlreadyBookedError) throw new Error("That stall is already booked.");
    if (e instanceof ContractNotSignedError) throw new Error("This vendor hasn't signed the contract yet.");
    throw e;
  }
  revalidate(id);
}

export async function assignStallAction(formData: FormData): Promise<void> {
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
}

/** Approve-before-pay: confirm the reserved stall and open it for vendor payment. */
export async function approveForPaymentAction(formData: FormData): Promise<void> {
  const session = await requirePermission("VENDOR_MANAGE");
  const id = String(formData.get("id"));
  try {
    await approveForPayment(session, id);
  } catch (e) {
    if (e instanceof ContractNotSignedError) throw new Error("This vendor hasn't signed the agreement yet.");
    throw e;
  }
  revalidate(id);
}

export async function logCallbackAction(formData: FormData): Promise<void> {
  const session = await requirePermission("VENDOR_MANAGE");
  const id = String(formData.get("id"));
  const note = String(formData.get("note") ?? "");
  await logCallback(session, id, note);
  revalidate(id);
}

export async function rejectAction(formData: FormData): Promise<void> {
  const session = await requirePermission("VENDOR_MANAGE");
  const id = String(formData.get("id"));
  await rejectVendor(session, id);
  revalidate(id);
}
