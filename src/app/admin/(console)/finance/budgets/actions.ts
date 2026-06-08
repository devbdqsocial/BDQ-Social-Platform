"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/auth/guard";
import { upsertBudget } from "@/server/finance/expenses";
import { budgetSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

export async function saveBudgetAction(formData: FormData): Promise<void> {
  const session = await requirePermission("FINANCE_MANAGE");
  const data = parseOrThrow(budgetSchema, {
    eventId: formData.get("eventId"),
    category: formData.get("category"),
    plannedPaise: Math.round(Number(formData.get("plannedRupees")) * 100),
  });
  await upsertBudget(session, data);
  revalidatePath("/admin/finance/budgets");
}
