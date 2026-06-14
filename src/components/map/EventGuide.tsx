"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { StallStatus } from "@/lib/stall-colors";
import type { EventGuide as Guide, GuideBrand, Bucket } from "@/server/map/guide";

const MapCanvas = dynamic(() => import("./MapCanvas"), {
  ssr: false,
  loading: () => <div className="grid h-80 place-items-center rounded-[var(--radius-lg)]" style={{ border: "1px solid var(--color)" }}><span className="kicker opacity-60">Loading the venue…</span></div>,
});

const CHIPS: ("All" | Bucket)[] = ["All", "Food", "Shopping", "Experience"];
const BUCKET_NOUN: Record<Bucket, string> = { Food: "Food & drink", Shopping: "Shopping", Experience: "Experience" };

/**
 * Customer event guide (map-system §11b / customer-portal §3.4). A festival companion: find
 * brands, food, experiences and facilities — never availability, layers, or scoring.
 */
export function EventGuide({ guide }: { guide: Guide }) {
  const [bucket, setBucket] = useState<"All" | Bucket>("All");
  const [q, setQ] = useState("");
  const [sheet, setSheet] = useState<GuideBrand | null>(null);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return guide.brands.filter(
      (b) =>
        (bucket === "All" || b.bucket === bucket) &&
        (!qq || b.brandName.toLowerCase().includes(qq) || (b.zone ?? "").toLowerCase().includes(qq) || (b.productCategory ?? "").toLowerCase().includes(qq)),
    );
  }, [guide.brands, bucket, q]);

  // Group brands by zone (festival "areas"); fall back to one group when the layout has no zones.
  const groups = useMemo(() => {
    const map = new Map<string, GuideBrand[]>();
    for (const b of filtered) {
      const k = b.zone ?? "The market";
      (map.get(k) ?? map.set(k, []).get(k)!).push(b);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  // Map: booked stalls (now labelled with the brand name) read as "here's a brand".
  const statuses = useMemo<Record<string, StallStatus>>(() => Object.fromEntries(guide.brands.map((b) => [b.brandName, "BOOKED" as StallStatus])), [guide.brands]);

  return (
    <div className="space-y-[var(--space-2xl)]">
      {/* Find bar — chips + search */}
      <div className="space-y-[var(--space-md)]">
        <div className="flex flex-wrap gap-[var(--space-sm)]">
          {CHIPS.map((c) => (
            <button key={c} type="button" onClick={() => setBucket(c)} data-cursor
              className="rounded-full px-[var(--space-lg)] py-[var(--space-sm)] f-paragraph-small f-bold t-upper transition-colors"
              style={{ letterSpacing: "0.06em", border: "1px solid var(--color)", background: bucket === c ? "var(--color)" : "transparent", color: bucket === c ? "var(--bgcolor)" : "var(--color)" }}>
              {c === "All" ? "Everything" : c === "Food" ? "Food & drink" : c}
            </button>
          ))}
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brands, food, areas…" aria-label="Search the guide"
          className="f-paragraph w-full bg-transparent pb-[var(--space-sm)] outline-none" style={{ borderBottom: "1px solid var(--color)" }} />
      </div>

      {/* Facilities quick-find */}
      {guide.facilities.length > 0 && (
        <div>
          <p className="kicker opacity-70">Find your way</p>
          <ul className="mt-[var(--space-sm)] flex flex-wrap gap-[var(--space-sm)]">
            {guide.facilities.map((f) => (
              <li key={f.label} className="rounded-full px-[var(--space-md)] py-[var(--space-xs)] f-paragraph-small" style={{ border: "1px solid color-mix(in srgb, currentColor 30%, transparent)" }}>{f.label}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Brand discovery */}
      {guide.brands.length === 0 ? (
        <p className="f-paragraph p-[var(--space-2xl)] text-center opacity-70" style={{ border: "1px dashed var(--color)" }}>
          The brand line-up is announced closer to the event. Check back soon.
        </p>
      ) : filtered.length === 0 ? (
        <p className="f-paragraph-small opacity-70">Nothing matches that — try another area or clear the search.</p>
      ) : (
        <div className="space-y-[var(--space-2xl)]">
          {groups.map(([zone, items]) => (
            <div key={zone}>
              <h2 className="f-exat f-h42">{zone}</h2>
              <ul className="mt-[var(--space-lg)] grid gap-[var(--space-lg)] sm:grid-cols-2">
                {items.map((b) => (
                  <li key={b.stallLabel}>
                    <button type="button" onClick={() => setSheet(b)} data-cursor className="surface-1 block w-full p-[var(--space-lg)] text-left" style={{ border: "1px solid color-mix(in srgb, currentColor 22%, transparent)" }}>
                      <p className="kicker opacity-70">{BUCKET_NOUN[b.bucket]}</p>
                      <p className="f-exat mt-[var(--space-xs)] f-h32">{b.brandName}</p>
                      {b.description && <p className="f-paragraph-small mt-[var(--space-xs)] line-clamp-2 opacity-75">{b.description}</p>}
                      <p className="f-paragraph-small mt-[var(--space-sm)] opacity-60">{b.zone ? `In ${b.zone}` : "At the market"} · Tap for details</p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* What's on */}
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-md)] py-[var(--space-lg)]" style={{ borderTop: "1px solid var(--color)", borderBottom: "1px solid var(--color)" }}>
        <p className="f-paragraph">Want the timings? See what&apos;s on through the evening.</p>
        <Link href="/schedule" className="btn" data-cursor><span className="btn__text">View schedule</span></Link>
      </div>

      {/* Take a look around — spatial context */}
      {guide.hasLayout && (
        <div>
          <p className="kicker opacity-70">Take a look around</p>
          <div className="mt-[var(--space-sm)]">
            <MapCanvas layout={guide.layout} statuses={statuses} />
          </div>
        </div>
      )}

      {/* Brand sheet */}
      {sheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setSheet(null)}>
          <div className="absolute inset-0 bg-navy-500/55" />
          <div role="dialog" aria-label={sheet.brandName} onClick={(e) => e.stopPropagation()} className="surface-1 paint relative w-full max-w-[40rem] rounded-t-[var(--radius-lg)] p-[var(--space-2xl)] sm:rounded-[var(--radius-lg)]" style={{ border: "1px solid var(--color)" }}>
            <button type="button" onClick={() => setSheet(null)} aria-label="Close" className="absolute right-[var(--space-lg)] top-[var(--space-lg)] f-h32 opacity-60">×</button>
            <p className="kicker opacity-70">{BUCKET_NOUN[sheet.bucket]}{sheet.zone ? ` · ${sheet.zone}` : ""}</p>
            <h2 className="f-exat mt-[var(--space-xs)] f-h60">{sheet.brandName}</h2>
            {sheet.description && <p className="f-paragraph mt-[var(--space-md)] opacity-85">{sheet.description}</p>}
            <p className="f-paragraph-small mt-[var(--space-md)] opacity-65">{sheet.zone ? `In ${sheet.zone} — find stall ${sheet.stallLabel} on the day.` : `Stall ${sheet.stallLabel}.`}</p>
            <div className="mt-[var(--space-xl)]">
              <Link href={`/vendors/${sheet.vendorId}`} className="btn" data-cursor><span className="btn__text">View brand</span></Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
