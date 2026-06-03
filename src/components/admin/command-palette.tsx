"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { NAV_DASHBOARD, NAV_GROUPS } from "./nav-config";

export function CommandPalette({ allowed }: { allowed: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const allow = new Set(allowed);
  const dashboard = NAV_DASHBOARD;
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => allow.has(i.section)) })).filter((g) => g.items.length > 0);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = (href: string) => { setOpen(false); router.push(href); };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2 text-muted-foreground" onClick={() => setOpen(true)}>
        <Search className="size-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to…" />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          <CommandGroup heading="Navigate">
            <CommandItem value={dashboard.label} onSelect={() => go(dashboard.href)}>{dashboard.label}</CommandItem>
            {groups.flatMap((g) =>
              g.items.map((it) => (
                <CommandItem key={it.href} value={`${g.label} ${it.label}`} onSelect={() => go(it.href)}>
                  {g.label} · {it.label}
                </CommandItem>
              )),
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
