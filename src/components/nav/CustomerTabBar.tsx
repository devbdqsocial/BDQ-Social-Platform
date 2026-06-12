"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Ticket, Store, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Home", icon: Home, exact: true },
  { href: "/events", label: "Events", icon: CalendarDays },
  { href: "/dashboard", label: "Dashboard", icon: Ticket },
  { href: "/vendors", label: "Brands", icon: Store },
];

/** Mobile-only bottom navigation for the customer experience. Hidden on >=sm (header serves there). */
export function CustomerTabBar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-500/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around">
        {TABS.map((t) => {
          const active = t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-12 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors",
                active ? "text-lavender-400" : "text-cream-100/70 hover:text-cream-100",
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
