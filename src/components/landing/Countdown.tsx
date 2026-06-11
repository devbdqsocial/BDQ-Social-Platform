"use client";

import { useEffect, useState } from "react";
import { timeLeft } from "@/lib/countdown";

const pad = (n: number) => String(n).padStart(2, "0");

export function Countdown({ target }: { target: string }) {
  const date = new Date(target);
  const [t, setT] = useState(() => timeLeft(date));

  useEffect(() => {
    const id = setInterval(() => setT(timeLeft(date)), 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  if (t.done) return <p className="kicker">Happening now</p>;

  const cells: [number, string][] = [
    [t.days, "days"],
    [t.hours, "hrs"],
    [t.mins, "min"],
    [t.secs, "sec"],
  ];

  return (
    <div className="flex gap-[var(--space-md)]" suppressHydrationWarning>
      {cells.map(([v, label]) => (
        <div
          key={label}
          className="px-[var(--space-md)] py-[var(--space-sm)] text-center"
          style={{ border: "1px solid color-mix(in srgb, currentColor 35%, transparent)" }}
        >
          <div className="f-exat tabular-nums" style={{ fontSize: "var(--h42)", lineHeight: 1 }}>{pad(v)}</div>
          <div className="kicker mt-[var(--space-xs)] opacity-75">{label}</div>
        </div>
      ))}
    </div>
  );
}
