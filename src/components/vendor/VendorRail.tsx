"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export type RailItem = { href: string; label: string };

/**
 * Vendor-zone navy rail (vendor-portal.md §2/§3) — the RPA chrome for the vendor portal.
 * Separate from the shared admin `ZoneSidebar` so the admin console stays neutral OKLCH
 * (locked rule). Navy `.bg-ink` field, lavender ink, fixed sidebar >=sm + drawer on mobile.
 */
export function VendorRail({ items, footer }: { items: RailItem[]; footer?: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string, i: number) =>
    i === 0 ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const brandMark = (
    <Link href="/vendor/home" className="flex items-baseline gap-2">
      <span className="f-exat f-h32 leading-none">
        BDQ<span style={{ color: "var(--light-blue)" }}>.</span>
      </span>
      <span className="kicker opacity-70">Vendor</span>
    </Link>
  );

  const links = (onClick?: () => void) =>
    items.map((it, i) => {
      const active = isActive(it.href, i);
      return (
        <Link
          key={it.href}
          href={it.href}
          onClick={onClick}
          aria-current={active ? "page" : undefined}
          className="f-paragraph flex min-h-11 items-center rounded-md px-3 py-2 font-bold transition-colors"
          style={
            active
              ? { background: "color-mix(in srgb, var(--light-blue) 18%, transparent)", color: "var(--light-blue)" }
              : { color: "color-mix(in srgb, var(--light-blue) 78%, white)" }
          }
        >
          {it.label}
        </Link>
      );
    });

  return (
    <>
      {/* Desktop rail */}
      <aside
        className="rpa bg-ink hidden w-60 shrink-0 flex-col p-[var(--space-lg)] sm:flex"
        style={{ color: "var(--light-blue)" }}
      >
        <div className="mb-[var(--space-2xl)]">{brandMark}</div>
        <nav className="flex flex-col gap-1">{links()}</nav>
        {footer && <div className="mt-auto pt-[var(--space-2xl)]">{footer}</div>}
      </aside>

      {/* Mobile top bar */}
      <div
        className="rpa bg-ink flex h-14 items-center justify-between px-[var(--space-lg)] sm:hidden"
        style={{ color: "var(--light-blue)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="grid size-11 place-items-center rounded-md"
        >
          <Menu className="size-5" />
        </button>
        {brandMark}
        <span className="size-11" aria-hidden />
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            className="rpa bg-ink absolute inset-y-0 left-0 flex w-[min(16rem,85vw)] flex-col p-[var(--space-lg)] shadow-lg"
            style={{ color: "var(--light-blue)" }}
          >
            <div className="mb-[var(--space-2xl)] flex items-center justify-between">
              {brandMark}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="grid size-11 place-items-center rounded-md"
              >
                <X className="size-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">{links(() => setOpen(false))}</nav>
            {footer && (
              <div className="mt-auto pt-[var(--space-2xl)]" onClick={() => setOpen(false)}>
                {footer}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
