"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { NAV_DASHBOARD, NAV_GROUPS } from "./nav-config";
import { adminSearch, type SearchHit } from "@/app/admin/(console)/search-actions";

export function CommandPalette({ allowed }: { allowed: string[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
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

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setHits([]); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await adminSearch(q);
      if (!cancelled) setHits(r);
    }, 250);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query]);

  const go = (href: string) => { setOpen(false); setQuery(""); router.push(href); };

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2 text-muted-foreground" onClick={() => setOpen(true)}>
        <Search className="size-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden rounded border bg-muted px-1.5 font-mono text-[10px] sm:inline">⌘K</kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Jump to or search events, vendors, orders…" value={query} onValueChange={setQuery} />
        <CommandList>
          <CommandEmpty>No results.</CommandEmpty>
          {hits.length > 0 && (
            <CommandGroup heading="Results">
              {hits.map((h, i) => (
                <CommandItem key={`${h.href}-${i}`} value={`${query} ${h.label} ${h.sub}`} onSelect={() => go(h.href)}>
                  <span className="truncate">{h.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{h.sub}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
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
