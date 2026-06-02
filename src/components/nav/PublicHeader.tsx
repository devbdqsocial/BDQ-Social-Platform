"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/events", label: "Events" },
  { href: "/vendors", label: "Brands" },
  { href: "/map", label: "Floor plan" },
];

export function PublicHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight" onClick={() => setOpen(false)}>
          BDQ <span className="text-primary">Social</span>
        </Link>

        {/* Desktop */}
        <nav className="hidden items-center gap-1 sm:flex">
          {LINKS.map((l) => (
            <Button key={l.href} asChild variant="ghost" size="sm">
              <Link href={l.href}>{l.label}</Link>
            </Button>
          ))}
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/events">Get tickets</Link>
          </Button>
          <ThemeToggle />
        </nav>

        {/* Mobile */}
        <div className="flex items-center gap-1 sm:hidden">
          <Button asChild size="sm">
            <Link href="/events">Tickets</Link>
          </Button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="grid size-9 place-items-center rounded-md hover:bg-muted"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav className="border-t border-border bg-background px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-1">
            {[...LINKS, { href: "/login", label: "Sign in" }].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-2 text-sm hover:bg-muted"
              >
                {l.label}
              </Link>
            ))}
            <div className="px-3 pt-2">
              <ThemeToggle />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
