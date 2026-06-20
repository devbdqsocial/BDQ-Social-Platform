"use client";
import { useEffect, useMemo, useState } from "react";
import { timeLeft, type TimeLeft } from "@/lib/countdown";

// Delicate serif countdown. Value source is the tested timeLeft() on a 1s interval; digits sit in
// fixed-width slots so the (non-tabular) serif numerals never reflow as they tick.
const pad = (n: number) => String(n).padStart(2, "0");

function Unit({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="cs-serif flex" style={{ fontSize: "clamp(1.7rem, 4vw, 2.7rem)", lineHeight: 1, color: "var(--ink)" }}>
        {value.split("").map((d, i) => (
          <span key={i} className="inline-block text-center" style={{ width: "0.66em", fontVariantNumeric: "lining-nums tabular-nums" }}>
            {d}
          </span>
        ))}
      </div>
      <span className="mt-[0.8rem] text-[var(--cs-fs-micro)] uppercase" style={{ letterSpacing: "0.28em", color: "var(--ink-soft)" }}>
        {label}
      </span>
    </div>
  );
}

export function InviteCountdown({ targetIso }: { targetIso: string | null }) {
  const target = useMemo(() => (targetIso ? new Date(targetIso) : null), [targetIso]);
  const [left, setLeft] = useState<TimeLeft | null>(() => (target ? timeLeft(target) : null));

  useEffect(() => {
    if (!target) return;
    setLeft(timeLeft(target));
    const id = setInterval(() => setLeft(timeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!left || left.done) return null;

  const units = [
    { label: "Days", value: pad(left.days) },
    { label: "Hours", value: pad(left.hours) },
    { label: "Minutes", value: pad(left.mins) },
    { label: "Seconds", value: pad(left.secs) },
  ];

  return (
    <div className="cs-reveal mt-[clamp(1.6rem,4vh,2.3rem)]" style={{ "--d": "0.5s" } as React.CSSProperties}>
      <p className="mb-[1.1rem] text-[var(--cs-fs-micro)] uppercase" style={{ letterSpacing: "0.32em", color: "var(--ink-soft)" }}>
        Doors open in
      </p>
      <div
        className="flex items-start justify-center gap-[clamp(1rem,5vw,2.75rem)]"
        role="timer"
        aria-label={`${left.days} days, ${left.hours} hours, ${left.mins} minutes until doors open`}
      >
        {units.map((u) => (
          <Unit key={u.label} value={u.value} label={u.label} />
        ))}
      </div>
    </div>
  );
}
