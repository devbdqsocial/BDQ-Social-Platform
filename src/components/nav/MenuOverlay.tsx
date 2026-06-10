"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { EASE, STAGGER } from "@/lib/motion";
import { ThemeToggle } from "@/components/theme-toggle";
import { Magnetic } from "@/components/motion/Magnetic";
import { cn } from "@/lib/utils";

export type MenuLink = { href: string; label: string };

// RPA full-screen menu: deep-navy panel drops in (CSS transition), then link labels rise out
// of overflow masks via GSAP (skipped under reduced-motion — links are visible by default).
// Esc to close, body scroll lock.
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
  const nav = useRef<HTMLElement>(null);

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

  // Mask-rise the labels each time the panel opens.
  useEffect(() => {
    const el = nav.current;
    if (!open || !el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const labels = el.querySelectorAll("[data-menu-label]");
    const tween = gsap.fromTo(
      labels,
      { yPercent: 110 },
      { yPercent: 0, duration: 0.5, ease: EASE.strong, stagger: STAGGER.items, delay: 0.3 },
    );
    return () => {
      tween.kill();
      gsap.set(labels, { clearProps: "transform" });
    };
  }, [open]);

  return (
    <div
      id="menu-overlay"
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[120] flex flex-col transition-[opacity,transform] duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]",
        open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
      )}
      style={
        {
          background: "var(--dark-blue)",
          color: "var(--light-blue)",
          // gama pair for descendants (.btn reads these)
          "--bgcolor": "var(--dark-blue)",
          "--color": "var(--light-blue)",
        } as React.CSSProperties
      }
    >
      <div className="flex items-center justify-between px-[var(--wrapper-padd)] py-[var(--space-lg)]">
        <Link href="/" onClick={onClose} data-cursor className="f-exat" style={{ fontSize: "var(--h32)", lineHeight: 1 }}>
          BDQ<span style={{ color: "var(--green)" }}>.</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          data-cursor
          className="relative grid size-10 place-items-center"
        >
          <span className="absolute block h-[2px] w-7 rotate-45" style={{ background: "currentColor" }} />
          <span className="absolute block h-[2px] w-7 -rotate-45" style={{ background: "currentColor" }} />
        </button>
      </div>

      <nav ref={nav} className="wrapper flex flex-1 flex-col justify-center gap-[var(--space-md)]">
        {links.map((l, i) => (
          <Link key={l.href} href={l.href} onClick={onClose} data-cursor className="group flex w-fit items-baseline gap-[var(--space-lg)]">
            <span className="kicker opacity-50">{String(i + 1).padStart(2, "0")}</span>
            <span className="block overflow-hidden">
              <span
                data-menu-label
                className="f-exat block transition-colors duration-300 group-hover:text-[var(--green)]"
                style={{ fontSize: "var(--h100)", lineHeight: 1.05 }}
              >
                {l.label}
              </span>
            </span>
          </Link>
        ))}
      </nav>

      <div className="wrapper flex flex-wrap items-center justify-between gap-[var(--space-lg)] py-[var(--space-xl)]" style={{ borderTop: "1px solid color-mix(in srgb, currentColor 25%, transparent)" }}>
        <div className="f-paragraph-small f-bold flex items-center gap-[var(--space-xl)]">
          <a href="https://instagram.com/bdqsocial" target="_blank" rel="noreferrer" data-cursor className="link-underline t-upper" style={{ letterSpacing: "0.12em" }}>
            Instagram
          </a>
          {signedIn ? (
            <>
              <Link href="/dashboard" onClick={onClose} data-cursor className="link-underline t-upper" style={{ letterSpacing: "0.12em" }}>
                My tickets
              </Link>
              <button
                type="button"
                data-cursor
                onClick={() => {
                  onClose();
                  onSignOut();
                }}
                className="link-underline t-upper"
                style={{ letterSpacing: "0.12em" }}
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/login" onClick={onClose} data-cursor className="link-underline t-upper" style={{ letterSpacing: "0.12em" }}>
              Sign in
            </Link>
          )}
          <ThemeToggle />
        </div>
        <Magnetic>
          <Link href="/contact" onClick={onClose} data-cursor className="btn">
            <span className="btn__text">Let&apos;s talk</span>
          </Link>
        </Magnetic>
      </div>
    </div>
  );
}
