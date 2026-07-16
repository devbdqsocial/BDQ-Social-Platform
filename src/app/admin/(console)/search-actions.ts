"use server";

import { requireAdmin } from "@/server/auth/guard";
import { db } from "@/server/db";

export interface SearchHit { label: string; sub: string; href: string }

/** ⌘K entity search across events, vendors, and orders. */
export async function adminSearch(q: string): Promise<SearchHit[]> {
  await requireAdmin();
  const query = q.trim();
  if (query.length < 2) return [];

  try {
    const [events, vendors, orders, staff, attendees] = await Promise.all([
      db.event.findMany({ where: { name: { contains: query, mode: "insensitive" } }, take: 5, select: { slug: true, name: true } }),
      db.vendorProfile.findMany({ where: { brandName: { contains: query, mode: "insensitive" } }, take: 5, select: { id: true, brandName: true } }),
      db.order.findMany({
        where: { OR: [{ id: { startsWith: query } }, { user: { phone: { contains: query } } }] },
        take: 5,
        select: { id: true, user: { select: { phone: true } } },
      }),
      db.user.findMany({
        where: { name: { contains: query, mode: "insensitive" }, role: { in: ["STAFF", "SUPER_ADMIN"] } },
        take: 5,
        select: { id: true, name: true, role: true },
      }),
      db.ticket.findMany({
        where: { OR: [{ holderName: { contains: query, mode: "insensitive" } }, { holderEmail: { contains: query, mode: "insensitive" } }] },
        take: 5,
        select: { id: true, orderId: true, holderName: true, holderEmail: true },
      }),
    ]);

    return [
      ...events.map((e) => ({ label: e.name, sub: "Event", href: `/admin/events/${e.slug}` })),
      ...vendors.map((v) => ({ label: v.brandName, sub: "Vendor", href: `/admin/vendors/${v.id}` })),
      ...orders.map((o) => ({ label: o.user.phone ?? o.id.slice(0, 8), sub: "Order", href: `/admin/tickets/orders/${o.id}` })),
      ...staff.map((s) => ({ label: s.name ?? "Unknown", sub: "Staff", href: `/admin/ops/staff` })),
      ...attendees.map((t) => ({ label: t.holderName || t.holderEmail || "Attendee", sub: "Ticket", href: `/admin/tickets/orders/${t.orderId}` })),
    ];
  } catch (err) {
    console.error("Search failed:", err);
    return [];
  }
}
