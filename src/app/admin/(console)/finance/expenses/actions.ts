"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/guard";
import { createExpense, setExpenseStatus, deleteExpense } from "@/server/finance/expenses";
import { expenseSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";
import { signUpload, type UploadSignature } from "@/lib/cloudinary";

const PATH = "/admin/finance/expenses";

export async function saveExpenseAction(formData: FormData): Promise<void> {
  const session = await requirePermission("FINANCE_MANAGE");
  const data = parseOrThrow(expenseSchema, {
    eventId: String(formData.get("eventId") || "") || undefined,
    category: formData.get("category"),
    vendorProfileId: String(formData.get("vendorProfileId") || "") || undefined,
    title: formData.get("title"),
    amountPaise: Math.round(Number(formData.get("amountRupees")) * 100),
    incurredAt: formData.get("incurredAt"),
    note: String(formData.get("note") || "") || undefined,
    receiptUrl: String(formData.get("receiptUrl") || "") || undefined,
    status: formData.get("status") || "DRAFT",
  });
  await createExpense(session, data);
  revalidatePath(PATH);
}

export async function setExpenseStatusAction(formData: FormData): Promise<void> {
  const session = await requirePermission("FINANCE_MANAGE");
  const status = String(formData.get("status")) as "DRAFT" | "APPROVED" | "PAID";
  await setExpenseStatus(session, String(formData.get("id")), status);
  revalidatePath(PATH);
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  const session = await requirePermission("FINANCE_MANAGE");
  await deleteExpense(session, String(formData.get("id")));
  revalidatePath(PATH);
}

/** Mint a signed Cloudinary upload for an expense receipt (client uploads the file directly). */
export async function getReceiptSignatureAction(): Promise<UploadSignature> {
  await requirePermission("FINANCE_MANAGE");
  return signUpload("expense-receipts");
}
