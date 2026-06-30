import Link from "next/link";
import { Check, Lock } from "lucide-react";

export type VendorNodeState = "done" | "current" | "locked";

export interface VendorNode {
  key: string;
  label: string;
  state: VendorNodeState;
  /** What's needed (current/locked) or what happened (done). */
  sub?: string;
  /** Formatted timestamp shown under a done node. */
  timestamp?: string;
  /** Revisit link for a completed, editable step. */
  editHref?: string;
  editLabel?: string;
}

/**
 * The vendor application status spine (vendor-portal.md §3). Vertical six-node timeline:
 * done (filled dot + check), current (pulsing lavender dot), locked (faded dot + lock).
 * Lives inside the `.bdq` cream content; colours follow the section's --color/--light-blue.
 */
export function VendorTimeline({ nodes }: { nodes: VendorNode[] }) {
  return (
    <ol className="relative">
      {nodes.map((n, i) => {
        const last = i === nodes.length - 1;
        const muted = n.state === "locked";
        return (
          <li key={n.key} className="relative flex gap-[var(--space-lg)] pb-[var(--space-xl)] last:pb-0">
            {/* connector rail */}
            {!last && (
              <span
                aria-hidden
                className="absolute bottom-1 left-[0.65rem] top-6 w-px"
                style={{ background: "color-mix(in srgb, currentColor 20%, transparent)" }}
              />
            )}

            {/* node dot */}
            <span
              aria-hidden
              className={`relative z-[1] grid size-[1.3rem] shrink-0 place-items-center rounded-full${
                n.state === "current" ? " vendor-node-pulse" : ""
              }`}
              style={
                n.state === "done"
                  ? { background: "var(--color)", color: "var(--bgcolor)" }
                  : n.state === "current"
                    ? { background: "var(--light-blue)", color: "var(--dark-blue)" }
                    : { border: "1px solid currentColor", color: "currentColor", opacity: 0.4 }
              }
            >
              {n.state === "done" && <Check className="size-3" strokeWidth={3} />}
              {n.state === "locked" && <Lock className="size-[0.65rem]" />}
              {n.state === "current" && <span className="size-1.5 rounded-full" style={{ background: "var(--dark-blue)" }} />}
            </span>

            {/* content */}
            <div className={`min-w-0 flex-1 -mt-0.5${muted ? " opacity-40" : ""}`}>
              <p className="f-h32 f-exat">{n.label}</p>
              {n.sub && <p className="f-paragraph-small mt-1 opacity-80 text-pretty">{n.sub}</p>}
              {n.timestamp && <p className="f-paragraph-small mt-1 opacity-55">{n.timestamp}</p>}
              {n.editHref && (
                <Link href={n.editHref} className="link--split f-paragraph-small mt-1.5 font-bold">
                  {n.editLabel ?? "Edit"} <span className="arrow">→</span>
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
