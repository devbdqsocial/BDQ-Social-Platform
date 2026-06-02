"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Ticket, Store, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/tickets", label: "Tickets", icon: Ticket },
  { href: "/vendors", label: "Brands", icon: Store },
];

/** Mobile-only bottom navigation for the customer experience. Hidden on >=sm (header serves there). */
export function CustomerTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
