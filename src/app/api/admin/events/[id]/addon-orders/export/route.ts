import { requireAdminRole } from "@/server/auth/guard";
import { listAddOnOrders } from "@/server/addons/service";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminRole();
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  const { id } = await params;
  const orders = await listAddOnOrders(id);

  const csv = toCsv(
    orders.map((o) => ({
      vendor: o.booking.vendorProfile?.brandName ?? "",
      stall: o.booking.stall.label,
      items: o.lines.map((l) => `${l.qty}x ${l.addOn.name}`).join("; "),
      total: (o.totalPaise / 100).toFixed(2),
      paidAt: o.payment ? o.payment.createdAt.toISOString() : "",
    })),
    [
      { key: "vendor", label: "Vendor" },
      { key: "stall", label: "Stall" },
      { key: "items", label: "Items" },
      { key: "total", label: "Total (INR)" },
      { key: "paidAt", label: "Paid at" },
    ],
  );

  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="addon-orders.csv"' },
  });
}
