"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/server/auth/guard";
import { addSettlement, setSettlementStatus } from "@/server/finance/settlements";
import { settlementSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

const PATH = "/admin/finance/settlements";

export async function addSettlementAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const data = parseOrThrow(settlementSchema, {
    gatewayRef: formData.get("gatewayRef"),
    amountPaise: Math.round(Number(formData.get("amountRupees")) * 100),
    feePaise: Math.round(Number(formData.get("feeRupees") || 0) * 100),
    taxPaise: Math.round(Number(formData.get("taxRupees") || 0) * 100),
    settledAt: formData.get("settledAt"),
  });
  await addSettlement(session, data);
  revalidatePath(PATH);
}

export async function toggleSettlementAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const status = String(formData.get("status")) as "RECONCILED" | "UNMATCHED";
  await setSettlementStatus(session, String(formData.get("id")), status);
  revalidatePath(PATH);
}
