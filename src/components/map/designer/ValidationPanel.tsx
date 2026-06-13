"use client";

import { useDesigner } from "./DesignerContext";

/**
 * Validation drawer (map-system §4/§7/§8 / R2.5.16): consolidated errors + warnings (each row
 * focuses its object) plus the entry-flow throughput roll-up with per-SCAN_POINT lane editing.
 */
export function ValidationPanel() {
  const { validation, throughput, entryFlow, patchEntry, elements, focusOn } = useDesigner();
  const scanPoints = entryFlow.filter((o) => o.type === "SCAN_POINT");
  const errors = validation.filter((v) => v.severity === "error");
  const warnings = validation.filter((v) => v.severity === "warning");

  const focusItem = (focusId?: string) => {
    if (!focusId) return;
    const el = elements.find((e) => e.id === focusId);
    if (el) focusOn(el);
  };

  return (
    <aside className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Validation</h2>
        <span className={`text-xs ${errors.length ? "text-destructive" : warnings.length ? "text-amber-600" : "text-muted-foreground"}`}>
          {errors.length} errors · {warnings.length} warnings
        </span>
      </div>

      {/* throughput roll-up (§8) */}
      {entryFlow.length > 0 && (
        <div className="space-y-1 rounded-md border border-border p-2">
          <p className="text-xs font-medium text-muted-foreground">Gate throughput</p>
          <p className="text-xs">Capacity ≈ <b>{throughput.capacityPerHour.toLocaleString("en-IN")}/h</b> · {throughput.scanLanes} scan lane{throughput.scanLanes === 1 ? "" : "s"}</p>
          {scanPoints.map((o) => (
            <label key={o.id} className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span className="truncate">{o.label}</span>
              <select value={o.lanes ?? 1} onChange={(e) => patchEntry(o.id, { lanes: Number(e.target.value) })} className="h-7 rounded border border-border bg-background px-1 text-xs">
                {[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n} lane{n === 1 ? "" : "s"}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}

      {validation.length === 0 ? (
        <p className="text-xs text-muted-foreground">No issues — boundary, pathways, labels and prices all check out.</p>
      ) : (
        <ul className="space-y-1">
          {[...errors, ...warnings].map((v) => (
            <li key={v.key}>
              <button
                disabled={!v.focusId}
                onClick={() => focusItem(v.focusId)}
                className={`flex w-full items-start gap-2 rounded px-1.5 py-1 text-left text-xs ${v.focusId ? "hover:bg-accent" : "cursor-default"}`}
              >
                <span className={`mt-0.5 size-2 shrink-0 rounded-full ${v.severity === "error" ? "bg-destructive" : "bg-amber-500"}`} />
                <span className={v.severity === "error" ? "text-foreground" : "text-muted-foreground"}>{v.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
