"use client";

import { useEffect, useState } from "react";
import { icsHref } from "@/lib/ics";
import { TicketShare } from "@/components/tickets/TicketShare";

/**
 * Wallet flip card (delight.md section 4). Front = QR + essentials; back = details,
 * add-to-calendar, share, terms. Flips on tap/Enter; reduced-motion = crossfade.
 */

export interface TicketCardData {
  ticketId: string;
  orderId: string;
  eventName: string;
  typeName: string;
  startsAtIso: string;
  location: string | null;
  admitCount: number;
  status: string; // VALID | CHECKED_IN | ...
  qr: string; // data URL
  eventUrl?: string;
  holderPhone?: string;
}

const QR = 96;

export function TicketCard({ d }: { d: TicketCardData }) {
  const [flipped, setFlipped] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [hint, setHint] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!sessionStorage.getItem("ticketHint")) setHint(true);
  }, []);

  const flip = () => {
    setFlipped((f) => !f);
    if (hint) {
      setHint(false);
      sessionStorage.setItem("ticketHint", "1");
    }
  };

  const used = d.status === "CHECKED_IN";
  const start = new Date(d.startsAtIso);
  const dateLine = start.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const ics = icsHref({ uid: d.ticketId, title: d.eventName, start, location: d.location ?? undefined, url: d.eventUrl, description: `Your ${d.typeName} ticket - admits ${d.admitCount}.` });

  const faceBase = "absolute inset-0 flex gap-[var(--space-xl)] p-[var(--space-xl)]";
  const t = reduced ? "opacity .15s ease" : "transform .6s var(--ease-swift, cubic-bezier(.4,0,.2,1))";

  return (
    <div style={{ perspective: 1200 }}>
      <button
        type="button"
        onClick={flip}
        aria-pressed={flipped}
        aria-label={flipped ? "Show QR code" : "Show ticket details"}
        data-cursor
        className="relative block w-full text-left"
        style={{ minHeight: QR + 88 }}
      >
        <div
          className="relative h-full w-full"
          style={{ transformStyle: reduced ? undefined : "preserve-3d", transition: t, transform: reduced ? undefined : `rotateY(${flipped ? 180 : 0}deg)` }}
        >
          {/* FRONT - QR + essentials */}
          <div
            aria-hidden={flipped}
            className={`bdq-night paint relative items-center overflow-hidden rounded-[var(--radius-lg)] ${faceBase}`}
            style={{ backfaceVisibility: "hidden", position: "relative", opacity: reduced && flipped ? 0 : 1 }}
          >
            <div className="min-w-0 flex-1">
              <p className="f-exat f-h42">{d.eventName}</p>
              <p className="f-paragraph-small mt-[var(--space-xs)] opacity-70">{d.typeName} - {dateLine}</p>
              <div className="mt-[var(--space-md)] flex flex-wrap items-center gap-[var(--space-md)]">
                <span className={used ? "badge-bdq badge-bdq--muted" : "badge-bdq"}>{used ? "Checked in" : "Valid"}</span>
                {d.admitCount > 1 && <span className="badge-bdq">Admits {d.admitCount}</span>}
              </div>
            </div>
            <div className="shrink-0 rounded-2xl border-2 border-[#868EFF] bg-white p-2 shadow-[0_12px_28px_rgba(1,6,91,0.18)]">
              <div className="rounded-xl border border-[#01065B]/15 bg-white p-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.qr} alt="Ticket QR" width={QR} height={QR} className="block rounded-lg bg-white" style={{ width: QR, height: QR }} />
              </div>
              <p className="mt-1 text-center text-[10px] font-black uppercase tracking-[0.12em] text-[#01065B]">Scan at entry</p>
              <p className="text-center text-[10px] font-bold text-[#626682]">#{d.ticketId.slice(0, 8)}</p>
            </div>
            <span aria-hidden className="absolute bottom-[var(--space-sm)] right-[var(--space-md)] opacity-50">Flip</span>
            {hint && <span className="kicker absolute bottom-[var(--space-sm)] left-[var(--space-md)] opacity-60">Tap for details</span>}
          </div>

          {/* BACK - details + actions */}
          <div
            aria-hidden={!flipped}
            className={`bdq-surface-alt paint flex-col justify-between rounded-[var(--radius-lg)] ${faceBase}`}
            style={{ backfaceVisibility: "hidden", transform: reduced ? undefined : "rotateY(180deg)", position: "absolute", opacity: reduced ? (flipped ? 1 : 0) : 1, pointerEvents: reduced && !flipped ? "none" : undefined }}
          >
            <div className="space-y-[2px]">
              <p className="kicker opacity-70">Order #{d.orderId.slice(0, 8)}</p>
              {d.holderPhone && <p className="f-paragraph-small opacity-80">Holder {d.holderPhone}</p>}
              {d.location && <p className="f-paragraph-small opacity-80">{d.location}</p>}
              <p className="f-paragraph-small opacity-60">Gates open in the late afternoon - show this QR at entry.</p>
            </div>
            <div className="flex flex-wrap items-center gap-[var(--space-lg)]" onClick={(e) => e.stopPropagation()}>
              <a href={ics} download={`${d.eventName.replace(/\s+/g, "-").toLowerCase()}.ics`} className="f-paragraph-small f-bold t-upper link-underline" style={{ letterSpacing: "0.06em" }}>Add to calendar</a>
              <TicketShare ticketId={d.ticketId} eventName={d.eventName} shareUrl={d.eventUrl} variant="link" />
            </div>
            <p className="f-paragraph-small opacity-50">Keep your QR ready for entry.</p>
          </div>
        </div>
      </button>
    </div>
  );
}
