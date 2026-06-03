"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

const LABELS: Record<string, string> = {
  admin: "Admin", events: "Events", new: "Create", map: "Map Builder", venue: "Venue",
  vendors: "Vendors", sponsors: "Sponsors", checkin: "Check-in", comps: "Comp Tickets",
  waitlist: "Waitlists", analytics: "Analytics", coupons: "Coupons", staff: "Staff",
  audit: "Audit Logs", ops: "System", tickets: "Ticketing", finance: "Finance", growth: "Growth",
  system: "System", schedule: "Schedule",
};
const isId = (s: string) => /^[a-z0-9]{20,}$/.test(s);
const titleize = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export function Breadcrumbs() {
  const pathname = usePathname();
  const segs = pathname.split("/").filter(Boolean);
  const crumbs = segs.map((seg, i) => ({
    href: "/" + segs.slice(0, i + 1).join("/"),
    label: isId(seg) ? "Detail" : LABELS[seg] ?? titleize(seg),
  }));

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((c, i) => (
          <Fragment key={c.href}>
            <BreadcrumbItem>
              {i < crumbs.length - 1 ? (
                <BreadcrumbLink asChild><Link href={c.href}>{c.label}</Link></BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{c.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {i < crumbs.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
