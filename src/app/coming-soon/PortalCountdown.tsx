"use client";

import { useEffect, useMemo, useState } from "react";
import { timeLeft, type TimeLeft } from "@/lib/countdown";

const UNITS = [
  { key: "days", label: "Days" },
  { key: "hours", label: "Hours" },
  { key: "mins", label: "Minutes" },
  { key: "secs", label: "Seconds" },
] as const;

const pad = (n: number) => String(n).padStart(2, "0");

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="portal-countdown__tile">
      <span key={value} className="portal-countdown__value" aria-hidden>
        {value}
      </span>
      <span className="portal-countdown__label">{label}</span>
    </div>
  );
}

export function PortalCountdown({ targetIso }: { targetIso: string | null }) {
  const target = useMemo(() => (targetIso ? new Date(targetIso) : null), [targetIso]);
  const [left, setLeft] = useState<TimeLeft | null>(() => (target ? timeLeft(target) : null));

  useEffect(() => {
    if (!target) return;
    setLeft(timeLeft(target));
    const id = setInterval(() => setLeft(timeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  if (!target || !left || left.done) {
    return (
      <div className="portal-countdown portal-countdown--soon" aria-label="Date reveal soon. Invite window opening soon">
        <p>Date reveal soon.</p>
        <span>Invite window opening soon</span>
      </div>
    );
  }

  const values = {
    days: pad(left.days),
    hours: pad(left.hours),
    mins: pad(left.mins),
    secs: pad(left.secs),
  };

  return (
    <div
      className="portal-countdown"
      role="timer"
      aria-live="off"
      aria-label={`${left.days} days, ${left.hours} hours, ${left.mins} minutes until doors open`}
    >
      {UNITS.map((u) => (
        <Tile key={u.key} value={values[u.key]} label={u.label} />
      ))}
    </div>
  );
}
