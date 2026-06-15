import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type WizardStep = "basics" | "tickets" | "map" | "review";
const ORDER: { key: WizardStep; label: string }[] = [
  { key: "basics", label: "Basics" },
  { key: "tickets", label: "Tickets" },
  { key: "map", label: "Map" },
  { key: "review", label: "Review" },
];

/** Event create wizard progress (admin-portal §3). Steps before the current one are done; once a
 *  draft exists (eventId), completed steps link back to their setup screen (resume-safe). */
export function WizardSteps({ current, eventId }: { current: WizardStep; eventId?: string }) {
  const idx = ORDER.findIndex((s) => s.key === current);
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {ORDER.map((s, i) => {
        const done = i < idx;
        const isCurrent = i === idx;
        const href = eventId && i > 0 ? `/admin/events/${eventId}/setup?step=${s.key}` : undefined;
        const body = (
          <span
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5",
              isCurrent ? "border-primary bg-primary text-primary-foreground" : done ? "border-border text-foreground" : "border-border text-muted-foreground",
            )}
          >
            <span className={cn("grid size-5 place-items-center rounded-full text-xs font-semibold", isCurrent ? "bg-primary-foreground text-primary" : done ? "bg-success/15 text-success" : "bg-muted")}>
              {done ? <Check className="size-3" /> : i + 1}
            </span>
            {s.label}
          </span>
        );
        return (
          <li key={s.key} className="flex items-center gap-2">
            {href && done ? <Link href={href}>{body}</Link> : body}
            {i < ORDER.length - 1 && <span aria-hidden className="text-muted-foreground/40">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
