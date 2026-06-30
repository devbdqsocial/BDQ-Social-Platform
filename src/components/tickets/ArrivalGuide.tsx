"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { timeLeft } from "@/lib/countdown";
import { BdqWorld } from "@/components/motion/BdqWorld";

/**
 * Arrival guide (R6.2 Premium Success Experience). After buying, the wallet builds anticipation and
 * tells you how to get in — a calm, premium countdown + arrival essentials for the soonest event.
 * Luxury over gimmicks: one quiet card, live countdown, no noise.
 */
export function ArrivalGuide({ eventName, startsAtIso, location }: { eventName: string; startsAtIso: string; location: string | null }) {
  const start = new Date(startsAtIso);
  const [t, setT] = useState(() => timeLeft(start));

  useEffect(() => {
    const id = setInterval(() => setT(timeLeft(start)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startsAtIso]);

  const phrase = t.done
    ? "Happening now"
    : t.days >= 1
      ? `${t.days} day${t.days > 1 ? "s" : ""} to go`
      : t.hours >= 1
        ? `${t.hours} hr ${t.mins} min to go`
        : `${t.mins} min to go`;

  return (
    <div className="bdq-night paint relative overflow-hidden rounded-[var(--radius-lg)] p-[var(--space-xl)]">
      <BdqWorld tint="var(--light-blue)" className="opacity-20" />
      <div className="relative z-10">
        <p className="kicker opacity-75">{t.done ? "You're in — see you inside" : "Counting down"}</p>
        <p className="f-exat f-h42 mt-[var(--space-xs)]">{phrase}</p>
        <p className="f-paragraph-small mt-[var(--space-md)] max-w-[42ch] opacity-80">
          {t.done
            ? "Have your QR ready below — the gate team will scan you straight in."
            : "Gates open in the late afternoon. Your QR is in your wallet below — have it ready at entry."}
        </p>
        {location && (
          <div className="mt-[var(--space-lg)] flex flex-wrap items-center gap-[var(--space-xl)]">
            <Link href="/map" className="link--split f-paragraph-small font-bold" style={{ color: "var(--light-blue)" }}>
              Find your way <span className="arrow">→</span>
            </Link>
            <span className="f-paragraph-small opacity-60">{eventName} · {location}</span>
          </div>
        )}
      </div>
    </div>
  );
}
