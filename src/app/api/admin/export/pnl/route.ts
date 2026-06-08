import { requireSuperAdmin } from "@/server/auth/guard";
import { getEventPnl } from "@/server/finance/pnl";
import { toCsv } from "@/lib/csv";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inr = (paise: number) => (paise / 100).toFixed(2);

/** Income statement (P&L) for one event as CSV. */
export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, "export-pnl", 10, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    await requireSuperAdmin();
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const eventId = new URL(req.url).searchParams.get("eventId");
  if (!eventId) return new Response("eventId required", { status: 400 });

  const p = await getEventPnl(eventId);
  const rows: { line: string; amount: string }[] = [
    ...p.streams.flatMap((s) => [
      { line: `${s.stream} — gross`, amount: inr(s.gross) },
      { line: `${s.stream} — fees`, amount: inr(-s.fees) },
      { line: `${s.stream} — net`, amount: inr(s.net) },
    ]),
    { line: "Net revenue", amount: inr(p.netRevenue) },
    { line: "Foregone (discounts + comps)", amount: inr(p.foregone) },
    ...p.expensesByCategory.map((c) => ({ line: `Expense — ${c.category}`, amount: inr(-c.amountPaise) })),
    { line: "Total expenses", amount: inr(-p.expensesTotal) },
    { line: "Net profit", amount: inr(p.netProfit) },
    { line: "Margin %", amount: (p.marginPct * 100).toFixed(2) },
    { line: "ROI %", amount: p.roiPct == null ? "" : (p.roiPct * 100).toFixed(2) },
  ];

  const csv = toCsv(rows, [
    { key: "line", label: "Line" },
    { key: "amount", label: "Amount (INR)" },
  ]);

  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="pnl.csv"' },
  });
}
