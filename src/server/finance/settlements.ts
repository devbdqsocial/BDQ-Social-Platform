import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import type { SettlementInput } from "@/server/schemas";

/**
 * Settlement reconciliation. Razorpay periodically deposits collected money (net of fees) to the
 * org bank. We record each settlement and compare the running total against the net of all captured
 * online payments, so the "unsettled" figure flags money collected but not yet paid out.
 */

export function listSettlements() {
  return db.settlement.findMany({ orderBy: { settledAt: "desc" }, take: 200 });
}

/** Net of all captured Razorpay payments (amount − fee − tax) vs total recorded settlements. */
export async function getSettlementSummary() {
  const payments = await db.payment.aggregate({
    where: { gateway: "RAZORPAY", status: "CAPTURED" },
    _sum: { amount: true, feePaise: true, taxPaise: true },
  });
  const settled = await db.settlement.aggregate({ _sum: { amountPaise: true } });

  const capturedGross = payments._sum.amount ?? 0;
  const fees = (payments._sum.feePaise ?? 0) + (payments._sum.taxPaise ?? 0);
  const capturedNet = capturedGross - fees;
  const settledTotal = settled._sum.amountPaise ?? 0;
  return { capturedGross, fees, capturedNet, settledTotal, unsettled: capturedNet - settledTotal };
}

export async function addSettlement(session: Session, input: SettlementInput): Promise<void> {
  return withAudit(session, { action: "SETTLEMENT_ADD", entity: "Settlement" }, async () => ({
    before: null,
    run: async () => {
      const s = await db.settlement.create({ data: input });
      return { result: undefined, after: s };
    },
  }));
}

export async function setSettlementStatus(
  session: Session,
  id: string,
  status: "RECONCILED" | "UNMATCHED",
): Promise<void> {
  return withAudit(session, { action: "SETTLEMENT_STATUS", entity: "Settlement", entityId: id }, async () => {
    const before = await db.settlement.findUnique({ where: { id }, select: { status: true } });
    return {
      before,
      run: async () => {
        const s = await db.settlement.update({ where: { id }, data: { status }, select: { status: true } });
        return { result: undefined, after: s };
      },
    };
  });
}
