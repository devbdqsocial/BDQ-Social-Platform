import Link from "next/link";

/** Day-of-show card for a BOOKED vendor: stall, load-in/setup window (admin-set, often 1-2 days
 * before), gates-open and pack-down timings, and a link to the public run of show. */
const fmtFull = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d);
const fmtTime = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(d);
const sameDay = (a: Date, b: Date) => fmtFull(a).split(",")[0] === fmtFull(b).split(",")[0];

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-[var(--space-md)] py-[var(--space-sm)]" style={{ borderTop: "1px solid color-mix(in srgb, currentColor 14%, transparent)" }}>
      <span className="kicker opacity-60">{label}</span>
      <span className="f-paragraph-small f-bold text-right">{value}</span>
    </div>
  );
}

export function VendorDayCard({
  stallLabel,
  eventName,
  loadInStartsAt,
  loadInEndsAt,
  startsAt,
  endsAt,
}: {
  stallLabel: string;
  eventName: string;
  loadInStartsAt: Date | null;
  loadInEndsAt: Date | null;
  startsAt: Date;
  endsAt: Date;
}) {
  const loadIn =
    loadInStartsAt && loadInEndsAt
      ? sameDay(loadInStartsAt, loadInEndsAt)
        ? `${fmtFull(loadInStartsAt)} – ${fmtTime(loadInEndsAt)}`
        : `${fmtFull(loadInStartsAt)} → ${fmtFull(loadInEndsAt)}`
      : loadInStartsAt
        ? `From ${fmtFull(loadInStartsAt)}`
        : null;

  return (
    <section className="rounded-[var(--radius-lg)] p-[var(--space-xl)]" style={{ border: "1px solid color-mix(in srgb, currentColor 16%, transparent)", background: "color-mix(in srgb, currentColor 3%, transparent)" }}>
      <div className="flex flex-wrap items-baseline justify-between gap-[var(--space-md)]">
        <div>
          <p className="kicker opacity-60">Day of show</p>
          <h2 className="f-exat f-h42 mt-1">{eventName}</h2>
        </div>
        <Link href="/map" className="link--split f-paragraph-small font-bold" style={{ color: "var(--light-blue)" }}>
          Stall {stallLabel} — see on map <span className="arrow">-&gt;</span>
        </Link>
      </div>

      <div className="mt-[var(--space-lg)]">
        <Row label="Load-in / setup" value={loadIn ?? "Times shared closer to the date"} />
        <Row label="Gates open" value={fmtFull(startsAt)} />
        <Row label="Pack-down by" value={fmtFull(endsAt)} />
      </div>

      <Link href="/schedule" className="link--split f-paragraph-small font-bold mt-[var(--space-lg)] inline-block">
        See the full run of show <span className="arrow">-&gt;</span>
      </Link>
    </section>
  );
}
