import { requirePermission } from "@/server/auth/guard";
import { db } from "@/server/db";
import { toCsv } from "@/lib/csv";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inr = (paise: number) => (paise / 100).toFixed(2);

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, "export-orders", 10, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    await requirePermission("PAYMENT_VIEW");
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const url = new URL(req.url);
  const eventId = url.searchParams.get("eventId") || undefined;
  const skip = Number(url.searchParams.get("skip") ?? "0");
  const orders = await db.order.findMany({
    where: { status: "PAID", ...(eventId ? { eventId } : {}) },
    orderBy: { createdAt: "desc" },
    skip,
    take: 1000,
    select: {
      id: true,
      status: true,
      subtotal: true,
      discount: true,
      total: true,
      createdAt: true,
      event: { select: { name: true } },
      user: { select: { email: true, phone: true } },
    },
  });

  const csv = toCsv(
    orders.map((o) => ({
      id: o.id,
      event: o.event.name,
      customer: o.user?.email ?? o.user?.phone ?? "",
      status: o.status,
      subtotal: inr(o.subtotal),
      discount: inr(o.discount),
      total: inr(o.total),
      createdAt: o.createdAt.toISOString(),
    })),
    [
      { key: "id", label: "Order ID" },
      { key: "event", label: "Event" },
      { key: "customer", label: "Customer" },
      { key: "status", label: "Status" },
      { key: "subtotal", label: "Subtotal (INR)" },
      { key: "discount", label: "Discount (INR)" },
      { key: "total", label: "Total (INR)" },
      { key: "createdAt", label: "Created" },
    ],
  );

  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="orders.csv"' },
  });
}
