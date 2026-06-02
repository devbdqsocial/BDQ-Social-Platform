"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, ShieldCheck, Store, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

type Item = { href: string; label: string };

const brandIcons = { admin: ShieldCheck, vendor: Store };

/**
 * Console navigation for the admin + vendor zones. Renders a fixed sidebar on >=sm and a
 * full-width top bar with a slide-over drawer on mobile, so nav is reachable on every screen.
 * The first item is treated as the "home" link (exact-match active state).
 */
export function ZoneSidebar({
  variant,
  brand,
  items,
}: {
  variant: "admin" | "vendor";
  brand: string;
  items: Item[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const Icon = brandIcons[variant];

  const isActive = (href: string, i: number) =>
    i === 0 ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const brandMark = (
    <span className="flex items-center gap-2 font-display text-lg font-semibold text-sidebar-foreground">
      <Icon className="size-5 text-primary" /> {brand}
    </span>
  );

  const links = (onClick?: () => void) =>
    items.map((it, i) => (
      <Link
        key={it.href}
        href={it.href}
        onClick={onClick}
        className={cn(
          "rounded-md px-3 py-2 text-sm transition-colors",
          isActive(it.href, i)
            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        )}
      >
        {it.label}
      </Link>
    ));

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 sm:flex">
        <div className="mb-6">{brandMark}</div>
        <nav className="flex flex-col gap-1">{links()}</nav>
      </aside>

      {/* Mobile top bar */}
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 sm:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid size-9 place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <Menu className="size-5" />
        </button>
        {brandMark}
        <ThemeToggle />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-sidebar-border bg-sidebar p-4 shadow-lg">
            <div className="mb-6 flex items-center justify-between">
              {brandMark}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-md text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">{links(() => setOpen(false))}</nav>
          </div>
        </div>
      )}
    </>
  );
}
