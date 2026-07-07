"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import { markVendorNotificationsReadAction } from "@/app/vendor/(app)/actions";

export interface VendorBellItem {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  createdAt: string; // pre-formatted server-side
  unread: boolean;
}

/** Rail bell: vendor-targeted in-app notifications (approved / booked / doc status / offers). */
export function VendorBell({ items, unread }: { items: VendorBellItem[]; unread: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const markRead = async () => {
    setBusy(true);
    try {
      await markVendorNotificationsReadAction();
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
        className="relative grid size-11 place-items-center rounded-md transition-colors hover:bg-white/10"
      >
        <Bell className="size-5" />
        {unread > 0 && (
          <span
            className="absolute right-2 top-2 grid size-4 place-items-center rounded-full text-[10px] font-bold"
            style={{ background: "var(--light-blue)", color: "var(--dark-blue)" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Notifications">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            className="bdq bg-ink absolute inset-y-0 right-0 flex w-[min(22rem,92vw)] flex-col p-[var(--space-lg)] shadow-lg"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            <div className="mb-[var(--space-lg)] flex items-center justify-between">
              <p className="f-paragraph font-bold">Notifications</p>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-11 place-items-center rounded-md hover:bg-white/10">
                <X className="size-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <p className="f-paragraph-small opacity-70">Nothing yet — approvals, bookings, and document updates land here.</p>
            ) : (
              <ul className="min-h-0 flex-1 space-y-[var(--space-sm)] overflow-y-auto">
                {items.map((n) => {
                  const inner = (
                    <>
                      <span className="f-paragraph-small flex items-center gap-[var(--space-sm)] font-bold">
                        {n.unread && <span aria-hidden className="size-1.5 shrink-0 rounded-full" style={{ background: "var(--light-blue)" }} />}
                        {n.title}
                      </span>
                      {n.body && <span className="f-paragraph-small block opacity-70">{n.body}</span>}
                      <span className="f-paragraph-small block opacity-50">{n.createdAt}</span>
                    </>
                  );
                  const cls = "block rounded-md px-3 py-2 transition-colors hover:bg-white/10";
                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <Link href={n.href} onClick={() => setOpen(false)} className={cls}>
                          {inner}
                        </Link>
                      ) : (
                        <div className={cls}>{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {unread > 0 && (
              <button
                type="button"
                onClick={markRead}
                disabled={busy}
                className="f-paragraph-small mt-[var(--space-lg)] rounded-md px-3 py-2 text-left font-bold opacity-80 transition-opacity hover:opacity-100 disabled:opacity-50"
                style={{ border: "1px solid rgba(255,255,255,0.25)" }}
              >
                {busy ? "Marking…" : "Mark all read"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
