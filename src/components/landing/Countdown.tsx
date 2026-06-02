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

  if (t.done) return <p className="text-sm text-gold-300">Happening now</p>;

  const cells: [number, string][] = [
    [t.days, "days"],
    [t.hours, "hrs"],
    [t.mins, "min"],
    [t.secs, "sec"],
  ];

  return (
    <div className="flex gap-3" suppressHydrationWarning>
      {cells.map(([v, label]) => (
        <div key={label} className="rounded-lg bg-white/5 px-3 py-2 text-center">
          <div className="font-display text-2xl font-semibold text-gold-300">{pad(v)}</div>
          <div className="text-[10px] uppercase tracking-wider text-[#B7AB97]">{label}</div>
        </div>
      ))}
    </div>
  );
}
