"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Magnetic } from "@/components/motion/Magnetic";
import { MenuOverlay, type MenuLink } from "@/components/nav/MenuOverlay";

const LINKS: MenuLink[] = [
  { href: "/events", label: "Events & tickets" },
  { href: "/vendors", label: "The brands" },
  { href: "/map", label: "Event layout" },
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
];

// RPA-style fixed overlay header: transparent, pointer-events only on the logo + menu.
// Text colour follows the section under it via `--header-color` (SectionColorSync).
export function PublicHeader({ signedIn = false }: { signedIn?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <header
        className="pointer-events-none fixed inset-x-0 top-0 z-[110]"
        style={{ color: "var(--header-color, var(--foreground))" }}
      >
        <div className="flex items-center justify-between px-[var(--wrapper-padd)] py-[var(--space-lg)]">
          <Link
            href="/"
            data-cursor
            className="f-exat pointer-events-auto"
            style={{ fontSize: "var(--h32)", lineHeight: 1 }}
          >
            BDQ Social
          </Link>

          <div className="pointer-events-auto flex items-center gap-[var(--space-lg)]">
            <Link
              href="/events"
              data-cursor
              className="f-paragraph-small f-bold hidden t-upper sm:inline-block"
              style={{ letterSpacing: "0.14em" }}
            >
              Tickets
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="menu-overlay"
              data-cursor
              className="flex h-6 w-9 flex-col items-end justify-center gap-[5px]"
            >
              <span className="block h-[2px] w-full" style={{ background: "currentColor" }} />
              <span className="block h-[2px] w-2/3" style={{ background: "currentColor" }} />
            </button>
          </div>
        </div>
      </header>

      <MenuOverlay
        open={open}
        onClose={() => setOpen(false)}
        links={LINKS}
        signedIn={signedIn}
        onSignOut={signOut}
      />

      {/* Persistent "Let's talk" CTA — desktop only (mobile has the bottom tab bar). */}
      <Magnetic className="fixed bottom-[var(--space-xl)] right-[var(--space-xl)] z-[90] hidden sm:block">
        <Link href="/contact" data-cursor className="btn pointer-events-auto" style={{ width: "8.5rem" }}>
          <span className="btn__text">Let&apos;s talk</span>
        </Link>
      </Magnetic>
    </>
  );
}
