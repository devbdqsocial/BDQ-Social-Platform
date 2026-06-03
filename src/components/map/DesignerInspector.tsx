"use client";

import { useState } from "react";
import type { EditorElement } from "@/lib/map/designer-ops";
import { Button } from "@/components/ui/button";

interface Props {
  element: EditorElement | null;
  multiCount: number;
  onChange: (patch: Partial<EditorElement>) => void;
  onRelabel: (prefix: string, start: number) => void;
}

const fieldCls = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

function NumberField({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <input type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={(e) => onChange(Number(e.target.value))} className={fieldCls} />
    </label>
  );
}

function RelabelForm({ onRelabel }: { onRelabel: (prefix: string, start: number) => void }) {
  const [prefix, setPrefix] = useState("A-");
  const [start, setStart] = useState(1);
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="text-xs font-medium text-muted-foreground">Auto-number selection</p>
      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">Prefix<input value={prefix} onChange={(e) => setPrefix(e.target.value)} className={fieldCls} /></label>
        <label className="flex w-20 flex-col gap-1 text-xs text-muted-foreground">From<input type="number" value={start} onChange={(e) => setStart(Number(e.target.value))} className={fieldCls} /></label>
        <Button size="sm" variant="outline" onClick={() => onRelabel(prefix, start)}>Apply</Button>
      </div>
    </div>
  );
}

export function DesignerInspector({ element, multiCount, onChange, onRelabel }: Props) {
  if (multiCount > 1) {
    return (
      <aside className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{multiCount} selected</h2>
          <p className="text-xs text-muted-foreground">Use the toolbar to align/distribute, arrow keys to nudge, or relabel below.</p>
        </div>
        <RelabelForm onRelabel={onRelabel} />
      </aside>
    );
  }

  if (!element) {
    return (
      <aside className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Select an element to edit it. Drag to move, corner handles resize, shift-click or drag a box to multi-select.
      </aside>
    );
  }

  const isStall = element.kind === "stall";
  const rupees = element.priceInPaise != null ? element.priceInPaise / 100 : "";

  return (
    <aside className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Inspector</h2>
        <p className="text-xs text-muted-foreground">{element.kind} · {element.type}</p>
      </div>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Label
        <input value={element.label} onChange={(e) => onChange({ label: e.target.value })} className={fieldCls} />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X (ft)" value={element.xFt} onChange={(v) => onChange({ xFt: v })} />
        <NumberField label="Y (ft)" value={element.yFt} onChange={(v) => onChange({ yFt: v })} />
        <NumberField label="Width (ft)" value={element.widthFt} onChange={(v) => onChange({ widthFt: Math.max(1, v) })} />
        <NumberField label="Height (ft)" value={element.heightFt} onChange={(v) => onChange({ heightFt: Math.max(1, v) })} />
        <NumberField label="Rotation (°)" value={element.rotation} onChange={(v) => onChange({ rotation: v })} />
      </div>

      {isStall && (
        <>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Price (₹) — admin-entered
            <input type="number" min={0} step={1} value={rupees} placeholder="e.g. 15000"
              onChange={(e) => onChange({ priceInPaise: e.target.value === "" ? undefined : Math.round(Number(e.target.value) * 100) })}
              className={fieldCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Status
            <select value={element.status ?? "AVAILABLE"} onChange={(e) => onChange({ status: e.target.value as EditorElement["status"] })} className={fieldCls}>
              <option value="AVAILABLE">Available</option>
              <option value="BLOCKED">Blocked / reserved</option>
            </select>
          </label>
        </>
      )}
    </aside>
  );
}
