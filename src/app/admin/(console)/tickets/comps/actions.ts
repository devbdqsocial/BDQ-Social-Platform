"use server";

import { redirect } from "next/navigation";
import type { Result } from "@/lib/result";
import { toResult } from "@/server/action";
import { requireAdminRole } from "@/server/auth/guard";
import { generateComps } from "@/server/comps/service";

export async function generateCompsAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
  const session = await requireAdminRole();
  const ticketTypeId = String(formData.get("ticketTypeId") || "");
  const qty = Math.max(1, Math.min(200, Number(formData.get("qty") || 1)));
  if (!ticketTypeId) throw new Error("Pick a ticket type.");

  const orderId = await generateComps(session, {
    ticketTypeId,
    qty,
    group: formData.get("group") === "on",
    holderName: String(formData.get("holderName") || "").trim() || undefined,
    holderPhone: String(formData.get("holderPhone") || "").trim() || undefined,
    holderEmail: String(formData.get("holderEmail") || "").trim() || undefined,
  });

  redirect(`/admin/tickets/comps/${orderId}`);
  });
}
