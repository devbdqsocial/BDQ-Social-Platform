import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { listBudgets } from "@/server/finance/expenses";
import { getActiveEvent } from "@/server/admin/event-context";
import { EXPENSE_CATEGORIES } from "@/server/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { saveBudgetAction } from "./actions";

export const metadata: Metadata = { title: "Budgets" };

export default async function BudgetsPage() {
  await requirePermission("FINANCE_MANAGE");
  const { active } = await getActiveEvent();
  if (!active) {
    return (
      <div className="space-y-8">
        <PageHeader title="Budgets" description="Planned spend per category, per event." />
        <p className="text-sm text-muted-foreground">Create an event first to set its budget.</p>
      </div>
    );
  }

  const budgets = await listBudgets(active.id);
  const byCat = new Map(budgets.map((b) => [b.category, b.plannedPaise]));

  return (
    <div className="space-y-8">
      <PageHeader title="Budgets" description={`Planned spend per category for ${active.name}. Compared against actuals in P&L.`} />
      <ul className="divide-y divide-border border-y border-border">
        {EXPENSE_CATEGORIES.map((cat) => {
          const current = byCat.get(cat);
          return (
            <li key={cat} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="text-sm font-medium">{cat.replace(/_/g, " ")}</span>
              <form action={saveBudgetAction} className="flex items-center gap-2">
                <input type="hidden" name="eventId" value={active.id} />
                <input type="hidden" name="category" value={cat} />
                <Input
                  type="number"
                  name="plannedRupees"
                  min={0}
                  step="0.01"
                  defaultValue={current != null ? current / 100 : ""}
                  placeholder="0"
                  className="w-40"
                />
                <Button type="submit" variant="ghost" size="sm">Save</Button>
              </form>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
