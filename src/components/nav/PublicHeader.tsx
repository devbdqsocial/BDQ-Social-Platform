"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu, X, UserRound, Ticket, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/events", label: "Events" },
  { href: "/vendors", label: "Brands" },
  { href: "/map", label: "Event layout" },
];

export function PublicHeader({ signedIn = false }: { signedIn?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setMenu(false);
    setOpen(false);
    router.push("/");
    router.refresh();
  };

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
          <Button asChild size="sm">
            <Link href="/events">Get tickets</Link>
          </Button>
          {signedIn ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenu((v) => !v)}
                aria-label="Account"
                aria-expanded={menu}
                className="grid size-9 place-items-center rounded-full border border-border bg-card hover:bg-muted"
              >
                <UserRound className="size-5" />
              </button>
              {menu && (
                <div className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-popover p-1 shadow-md">
                  <Link href="/tickets" onClick={() => setMenu(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
                    <Ticket className="size-4" /> My tickets
                  </Link>
                  <button onClick={signOut} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted">
                    <LogOut className="size-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
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
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-muted">
                {l.label}
              </Link>
            ))}
            {signedIn ? (
              <>
                <Link href="/tickets" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-muted">My tickets</Link>
                <button onClick={signOut} className="rounded-md px-3 py-2 text-left text-sm hover:bg-muted">Sign out</button>
              </>
            ) : (
              <Link href="/login" onClick={() => setOpen(false)} className="rounded-md px-3 py-2 text-sm hover:bg-muted">Sign in</Link>
            )}
            <div className="px-3 pt-2">
              <ThemeToggle />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
