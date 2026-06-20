"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Bucket } from "@/server/map/guide";
import { CARD_SHAPES } from "@/lib/shapes";

export interface DiscoverVendor {
  id: string;
  brandName: string;
  category: string | null;
  bucket: Bucket;
  logo: string | null;
}

const CHIPS: ("All" | Bucket)[] = ["All", "Food", "Shopping", "Experience"];
const CHIP_LABEL: Record<"All" | Bucket, string> = { All: "Everyone", Food: "Food & drink", Shopping: "Shopping", Experience: "Experiences" };

/**
 * Brand discovery (customer-portal §3.5). Client-side filter over the approved line-up (≤200, no
 * API): a search field + category chips with live counts → brand cards. Anonymous-friendly.
 */
export function VendorDiscover({ vendors }: { vendors: DiscoverVendor[] }) {
  const [bucket, setBucket] = useState<"All" | Bucket>("All");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: vendors.length, Food: 0, Shopping: 0, Experience: 0 };
    for (const v of vendors) c[v.bucket]++;
    return c;
  }, [vendors]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return vendors.filter((v) => (bucket === "All" || v.bucket === bucket) && (!qq || v.brandName.toLowerCase().includes(qq) || (v.category ?? "").toLowerCase().includes(qq)));
  }, [vendors, bucket, q]);

  return (
    <div className="space-y-[var(--space-2xl)]">
      <div className="space-y-[var(--space-md)]">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brands…" aria-label="Search brands"
          className="f-paragraph w-full bg-transparent pb-[var(--space-sm)] outline-none" style={{ borderBottom: "1px solid var(--color)" }} />
        <div className="flex flex-wrap gap-[var(--space-sm)]">
          {CHIPS.filter((c) => c === "All" || counts[c] > 0).map((c) => (
            <button key={c} type="button" onClick={() => setBucket(c)} data-cursor
              className="rounded-full px-[var(--space-lg)] py-[var(--space-sm)] f-paragraph-small f-bold transition-colors"
              style={{ border: "1px solid var(--color)", background: bucket === c ? "var(--color)" : "transparent", color: bucket === c ? "var(--bgcolor)" : "var(--color)" }}>
              {CHIP_LABEL[c]} <span className="opacity-60">{counts[c]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="f-paragraph py-[var(--space-2xl)] opacity-70">Nothing for &ldquo;{q}&rdquo; — try another category.</p>
      ) : (
        <div className="grid grid-cols-2 gap-[var(--grid-gap)] sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((v, i) => (
            <Link key={v.id} href={`/vendors/${v.id}`} data-cursor className="block">
              <div className={`svg ${CARD_SHAPES[i % CARD_SHAPES.length]} media-zoom w-full`}>
                {v.logo ? (
                  <Image src={v.logo} alt={v.brandName} fill className="svg__img" sizes="(max-width:768px) 50vw, 25vw" />
                ) : (
                  <div className="svg__bg grid place-items-center">
                    <span className="f-exat f-h60" style={{ color: "var(--bgcolor)" }}>{v.brandName.charAt(0)}</span>
                  </div>
                )}
              </div>
              <p className="f-paragraph-small f-bold mt-[var(--space-sm)] truncate">{v.brandName}</p>
              {v.category && <p className="f-paragraph-small truncate opacity-70">{v.category}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
