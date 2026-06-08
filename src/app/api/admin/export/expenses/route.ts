import { requirePermission } from "@/server/auth/guard";
import { db } from "@/server/db";
import { toCsv } from "@/lib/csv";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inr = (paise: number) => (paise / 100).toFixed(2);

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, "export-expenses", 10, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    await requirePermission("FINANCE_MANAGE");
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const eventId = new URL(req.url).searchParams.get("eventId") || undefined;
  const expenses = await db.expense.findMany({
    where: eventId ? { eventId } : {},
    orderBy: { incurredAt: "desc" },
    take: 5000,
    select: {
      id: true, category: true, title: true, amountPaise: true, status: true, incurredAt: true,
      event: { select: { name: true } }, vendorProfile: { select: { brandName: true } },
    },
  });

  const csv = toCsv(
    expenses.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category,
      amount: inr(e.amountPaise),
      status: e.status,
      event: e.event?.name ?? "Org-wide",
      vendor: e.vendorProfile?.brandName ?? "",
      incurredAt: e.incurredAt.toISOString().slice(0, 10),
    })),
    [
      { key: "id", label: "Expense ID" },
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      { key: "amount", label: "Amount (INR)" },
      { key: "status", label: "Status" },
      { key: "event", label: "Event" },
      { key: "vendor", label: "Vendor" },
      { key: "incurredAt", label: "Incurred" },
    ],
  );

  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="expenses.csv"' },
  });
}
