"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, CalendarClock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/input";

const IST = "Asia/Kolkata";
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n: number) => String(n).padStart(2, "0");

type Day = { y: number; m: number; d: number };

/** IST wall-clock parts from an instant. */
function istParts(d: Date) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: IST, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(d).map((x) => [x.type, x.value]));
  const hour = Number(p.hour) === 24 ? 0 : Number(p.hour);
  return { y: Number(p.year), m: Number(p.month) - 1, d: Number(p.day), hour, minute: Number(p.minute) };
}

/** Build an unambiguous IST instant string consumed by z.coerce.date(). */
function toIso(day: Day, hour: number, minute: number) {
  return `${day.y}-${pad(day.m + 1)}-${pad(day.d)}T${pad(hour)}:${pad(minute)}:00+05:30`;
}

function label(day: Day, hour: number, minute: number) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: IST })
    .format(new Date(toIso(day, hour, minute)));
}

export function DateTimePicker({
  name,
  defaultValue,
  required,
}: {
  name: string;
  defaultValue?: string | Date;
  required?: boolean;
}) {
  const init = React.useMemo(() => {
    if (!defaultValue) return null;
    const d = new Date(defaultValue);
    return Number.isNaN(d.getTime()) ? null : istParts(d);
  }, [defaultValue]);
  const today = React.useMemo(() => istParts(new Date()), []);

  const [sel, setSel] = React.useState<Day | null>(init ? { y: init.y, m: init.m, d: init.d } : null);
  const [hour, setHour] = React.useState(init ? init.hour : 12);
  const [minute, setMinute] = React.useState(init ? Math.round(init.minute / 5) * 5 : 0);
  const [viewY, setViewY] = React.useState((init ?? today).y);
  const [viewM, setViewM] = React.useState((init ?? today).m);
  const [open, setOpen] = React.useState(false);

  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const value = sel ? toIso(sel, hour, minute) : "";
  const firstWeekday = new Date(viewY, viewM, 1).getDay();
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const stepMonth = (delta: number) => {
    const m = viewM + delta;
    setViewY(viewY + Math.floor(m / 12));
    setViewM(((m % 12) + 12) % 12);
  };

  const h12 = ((hour + 11) % 12) + 1;
  const ampm = hour < 12 ? "AM" : "PM";
  const setH12 = (v: number, ap: string) => setHour((ap === "PM" ? 12 : 0) + (v % 12));

  return (
    <div className="relative" ref={ref}>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-invalid={required && !sel ? true : undefined}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 text-sm shadow-sm transition-colors",
          "hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none",
          "aria-invalid:border-destructive",
        )}
      >
        <span className={cn(!sel && "text-muted-foreground/70")}>
          {sel ? label(sel, hour, minute) : "Pick date & time"}
        </span>
        <CalendarClock className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-72 rounded-xl border border-border bg-popover p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => stepMonth(-1)} aria-label="Previous month" className="grid size-7 place-items-center rounded-md hover:bg-muted">
              <ChevronLeft className="size-4" />
            </button>
            <span className="text-sm font-medium">{MONTHS[viewM]} {viewY}</span>
            <button type="button" onClick={() => stepMonth(1)} aria-label="Next month" className="grid size-7 place-items-center rounded-md hover:bg-muted">
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((w) => <span key={w} className="py-1">{w}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d === null) return <span key={`e${i}`} />;
              const isSel = sel?.y === viewY && sel?.m === viewM && sel?.d === d;
              const isToday = today.y === viewY && today.m === viewM && today.d === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSel({ y: viewY, m: viewM, d })}
                  className={cn(
                    "grid size-9 place-items-center rounded-md text-sm hover:bg-muted",
                    isSel && "bg-primary text-primary-foreground hover:bg-primary/90",
                    !isSel && isToday && "font-semibold text-primary",
                  )}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="mt-3 grid grid-cols-[1fr_1fr_1fr] gap-2">
            <Select aria-label="Hour" value={h12} onChange={(e) => setH12(Number(e.target.value), ampm)}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => <option key={h} value={h}>{h}</option>)}
            </Select>
            <Select aria-label="Minute" value={minute} onChange={(e) => setMinute(Number(e.target.value))}>
              {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => <option key={m} value={m}>{pad(m)}</option>)}
            </Select>
            <Select aria-label="AM/PM" value={ampm} onChange={(e) => setH12(h12, e.target.value)}>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
