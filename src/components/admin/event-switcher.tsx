"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setActiveEventAction } from "@/app/admin/(console)/event-actions";

interface Ev { id: string; name: string; status: string }

export function EventSwitcher({ active, events }: { active: Ev | null; events: Ev[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const select = (id: string) => start(async () => { await setActiveEventAction(id); router.refresh(); });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending} className="max-w-[200px] gap-2 sm:max-w-[240px]">
          <span className="truncate">{active?.name ?? "No event"}</span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Active event</DropdownMenuLabel>
        {events.map((e) => (
          <DropdownMenuItem key={e.id} onClick={() => select(e.id)} className="gap-2">
            <Check className={cn("size-4", e.id === active?.id ? "opacity-100" : "opacity-0")} />
            <span className="flex-1 truncate">{e.name}</span>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{e.status}</span>
          </DropdownMenuItem>
        ))}
        {events.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">No events yet.</p>}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/admin/events/new"><Plus className="size-4" /> Create event</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
