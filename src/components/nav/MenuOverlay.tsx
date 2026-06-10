"use client";

import Link from "next/link";
import { useEffect } from "react";
import { X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Magnetic } from "@/components/motion/Magnetic";
import { cn } from "@/lib/utils";

export type MenuLink = { href: string; label: string };

// RPA full-screen menu: a deep-navy panel that drops in, with big grotesk links that stagger up.
// CSS-transition driven (auto-respects reduced-motion via globals), Esc to close, body scroll lock.
export function MenuOverlay({
  open,
  onClose,
  links,
  signedIn,
  onSignOut,
}: {
  open: boolean;
  onClose: () => void;
  links: MenuLink[];
  signedIn: boolean;
  onSignOut: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <div
      id="menu-overlay"
      aria-hidden={!open}
      className={cn(
        "bg-ink fixed inset-0 z-[120] flex flex-col text-cream-100 transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]",
        open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link href="/" onClick={onClose} className="font-display text-xl font-bold tracking-tight">
          BDQ<span className="text-lavender-400">.</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="grid size-11 place-items-center rounded-full border border-white/15 transition-colors hover:bg-white/10"
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center gap-1 px-4 sm:px-6">
        {links.map((l, i) => (
          <Link
            key={l.href}
            href={l.href}
            onClick={onClose}
            style={{ transitionDelay: open ? `${i * 55 + 120}ms` : "0ms" }}
            className={cn(
              "font-display text-4xl font-bold tracking-tight text-cream-100/90 transition-all duration-500 hover:text-lavender-400 sm:text-6xl",
              open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 border-t border-white/10 px-4 py-6 sm:px-6">
        <div className="flex items-center gap-4 text-sm text-cream-100/70">
          {signedIn ? (
            <>
              <Link href="/dashboard" onClick={onClose} className="link-underline hover:text-cream-100">
                My tickets
              </Link>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="link-underline hover:text-cream-100"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" onClick={onClose} className="link-underline hover:text-cream-100">
              Sign in
            </Link>
          )}
          <ThemeToggle />
        </div>
        <Magnetic>
          <Link
            href="/contact"
            onClick={onClose}
            data-cursor
            className="inline-flex h-12 items-center rounded-full bg-lavender-400 px-7 font-medium text-navy-900 transition-colors hover:bg-cream-100"
          >
            Let&apos;s talk
          </Link>
        </Magnetic>
      </div>
    </div>
  );
}
