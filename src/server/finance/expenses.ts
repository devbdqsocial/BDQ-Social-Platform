import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import type { ExpenseInput, BudgetInput } from "@/server/schemas";

/** Expense ledger (cost side). Money is integer paise. Every mutation here is audited. */

export function listExpenses(eventId?: string) {
  return db.expense.findMany({
    where: eventId ? { eventId } : {},
    orderBy: { incurredAt: "desc" },
    select: {
      id: true,
      category: true,
      title: true,
      amountPaise: true,
      incurredAt: true,
      status: true,
      receiptUrl: true,
      note: true,
      vendorProfile: { select: { brandName: true } },
      event: { select: { name: true } },
    },
  });
}

/** Vendor options for the optional counterparty dropdown (e.g. VENDOR_PAYOUT). */
export function listVendorOptions() {
  return db.vendorProfile.findMany({
    orderBy: { brandName: "asc" },
    select: { id: true, brandName: true },
  });
}

const approvedNow = (status: ExpenseInput["status"], userId: string) =>
  status === "DRAFT" ? undefined : userId;

export async function createExpense(session: Session, input: ExpenseInput): Promise<string> {
  return withAudit(session, { action: "EXPENSE_CREATE", entity: "Expense" }, async () => ({
    before: null,
    run: async () => {
      const e = await db.expense.create({
        data: {
          eventId: input.eventId,
          category: input.category,
          vendorProfileId: input.vendorProfileId,
          title: input.title,
          amountPaise: input.amountPaise,
          incurredAt: input.incurredAt,
          note: input.note,
          receiptUrl: input.receiptUrl,
          status: input.status,
          recordedById: session.userId,
          approvedById: approvedNow(input.status, session.userId),
        },
      });
      return { result: e.id, after: e };
    },
  }));
}

export async function setExpenseStatus(
  session: Session,
  id: string,
  status: ExpenseInput["status"],
): Promise<void> {
  return withAudit(session, { action: "EXPENSE_STATUS", entity: "Expense", entityId: id }, async () => {
    const before = await db.expense.findUnique({ where: { id }, select: { status: true } });
    return {
      before,
      run: async () => {
        const e = await db.expense.update({
          where: { id },
          data: { status, approvedById: approvedNow(status, session.userId) },
          select: { status: true },
        });
        return { result: undefined, after: e };
      },
    };
  });
}

export async function deleteExpense(session: Session, id: string): Promise<void> {
  return withAudit(session, { action: "EXPENSE_DELETE", entity: "Expense", entityId: id }, async () => {
    const before = await db.expense.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        await db.expense.delete({ where: { id } });
        return { result: undefined, after: null };
      },
    };
  });
}

// ── Budgets ────────────────────────────────────────────────────
export function listBudgets(eventId: string) {
  return db.budget.findMany({ where: { eventId }, orderBy: { category: "asc" } });
}

export async function upsertBudget(session: Session, input: BudgetInput): Promise<void> {
  return withAudit(session, { action: "BUDGET_SET", entity: "Budget" }, async () => {
    const key = { eventId_category: { eventId: input.eventId, category: input.category } };
    const before = await db.budget.findUnique({ where: key, select: { plannedPaise: true } });
    return {
      before,
      run: async () => {
        const b = await db.budget.upsert({
          where: key,
          update: { plannedPaise: input.plannedPaise },
          create: input,
        });
        return { result: undefined, after: { plannedPaise: b.plannedPaise } };
      },
    };
  });
}

// ── Recurring / installment expenses (driven by the cron) ──────
/**
 * Materialize every ExpenseSchedule whose nextRunAt has passed into a real DRAFT Expense, then
 * advance nextRunAt by the cadence and decrement installments (deactivating when they run out).
 * Idempotent enough for cron: a run that partially completes simply resumes on the next tick.
 */
export async function materializeDueExpenseSchedules(now = new Date()): Promise<number> {
  const due = await db.expenseSchedule.findMany({
    where: { active: true, nextRunAt: { lte: now } },
  });
  let created = 0;
  for (const s of due) {
    const next = new Date(s.nextRunAt);
    if (s.cadence === "WEEKLY") next.setDate(next.getDate() + 7);
    else next.setMonth(next.getMonth() + 1);
    const remaining = s.remaining == null ? null : s.remaining - 1;
    const stillActive = remaining == null || remaining > 0;

    await db.$transaction([
      db.expense.create({
        data: {
          eventId: s.eventId,
          category: s.category,
          title: s.title,
          amountPaise: s.amountPaise,
          incurredAt: s.nextRunAt,
          status: "DRAFT",
          scheduleId: s.id,
        },
      }),
      db.expenseSchedule.update({
        where: { id: s.id },
        data: { nextRunAt: next, remaining, active: stillActive },
      }),
    ]);
    created++;
  }
  return created;
}
