"use client";

import { useState } from "react";
import type { EditorElement, PaletteStallType } from "@/lib/map/designer-ops";
import { Button } from "@/components/ui/button";

interface Props {
  element: EditorElement | null;
  multiCount: number;
  stallTypes: PaletteStallType[];
  onChange: (patch: Partial<EditorElement>) => void;
  onBulkPatch: (patch: Partial<EditorElement>) => void;
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

function BulkEditForm({ count, stallTypes, onBulkPatch }: { count: number; stallTypes: PaletteStallType[]; onBulkPatch: (patch: Partial<EditorElement>) => void }) {
  const [w, setW] = useState("");
  const [h, setH] = useState("");
  const [typeId, setTypeId] = useState("");
  const [status, setStatus] = useState("");
  const [price, setPrice] = useState("");

  const apply = () => {
    const patch: Partial<EditorElement> = {};
    if (w !== "" && Number(w) > 0) patch.widthFt = Number(w);
    if (h !== "" && Number(h) > 0) patch.heightFt = Number(h);
    if (typeId) {
      const t = stallTypes.find((s) => s.id === typeId);
      if (t) { patch.type = t.name; patch.stallTypeId = t.id; }
    }
    if (status) patch.status = status as EditorElement["status"];
    if (price !== "") patch.priceInPaise = Math.round(Number(price) * 100);
    if (Object.keys(patch).length === 0) return;
    onBulkPatch(patch);
    setW(""); setH(""); setTypeId(""); setStatus(""); setPrice("");
  };

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <p className="text-xs font-medium text-muted-foreground">Bulk edit — only filled fields apply</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Width (ft)<input type="number" min={1} value={w} onChange={(e) => setW(e.target.value)} className={fieldCls} /></label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Height (ft)<input type="number" min={1} value={h} onChange={(e) => setH(e.target.value)} className={fieldCls} /></label>
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Type
        <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={fieldCls}>
          <option value="">— keep —</option>
          {stallTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Status
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={fieldCls}>
          <option value="">— keep —</option>
          <option value="AVAILABLE">Available</option>
          <option value="BLOCKED">Blocked / reserved</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Price (₹) — admin-entered
        <input type="number" min={0} step={1} value={price} placeholder="e.g. 15000" onChange={(e) => setPrice(e.target.value)} className={fieldCls} />
      </label>
      <Button size="sm" variant="outline" className="w-full" onClick={apply}>Apply to {count} selected</Button>
    </div>
  );
}

export function DesignerInspector({ element, multiCount, stallTypes, onChange, onBulkPatch, onRelabel }: Props) {
  if (multiCount > 1) {
    return (
      <aside className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{multiCount} selected</h2>
          <p className="text-xs text-muted-foreground">Align/distribute from the toolbar, arrow keys to nudge, or bulk-edit and relabel below.</p>
        </div>
        <BulkEditForm count={multiCount} stallTypes={stallTypes} onBulkPatch={onBulkPatch} />
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
