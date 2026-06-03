"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { markAllReadAction } from "@/app/admin/(console)/notification-actions";

interface Item { id: string; title: string; body: string | null; href: string | null; createdAt: Date; readAt: Date | null }

const ago = (d: Date) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export function NotificationsBell({ count, items }: { count: number; items: Item[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const markRead = () => start(async () => { await markAllReadAction(); router.refresh(); });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="size-5" />
          {count > 0 && (
            <span className="absolute right-1 top-1 grid size-4 place-items-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {count > 0 && <button type="button" onClick={markRead} disabled={pending} className="text-xs text-primary hover:underline">Mark all read</button>}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            items.map((n) => {
              const inner = (
                <div className={cn("border-b border-border px-3 py-2 last:border-0", !n.readAt && "bg-muted/40")}>
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{ago(n.createdAt)}</p>
                </div>
              );
              return n.href ? <Link key={n.id} href={n.href} className="block hover:bg-muted">{inner}</Link> : <div key={n.id}>{inner}</div>;
            })
          )}
        </div>
        <Link href="/admin/system/notifications" className="block border-t border-border px-3 py-2 text-center text-xs text-primary hover:bg-muted">View all</Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
