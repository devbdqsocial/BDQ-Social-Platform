"use client";

import { useState } from "react";
import type { EditorElement, PaletteStallType } from "@/lib/map/designer-ops";
import { describeStall, TIER_HEX, type StallScore } from "@/server/map/scoring";
import { Button } from "@/components/ui/button";

interface Props {
  element: EditorElement | null;
  multiCount: number;
  stallTypes: PaletteStallType[];
  score: StallScore | null;
  suggestion: number | null;
  salesView: boolean;
  onChange: (patch: Partial<EditorElement>) => void;
  onBulkPatch: (patch: Partial<EditorElement>) => void;
  onApplySuggestions: (scope: "selected" | "zone") => void;
  onRelabel: (prefix: string, start: number) => void;
}

const fmtRupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`;

function ScoreBreakdown({ score }: { score: StallScore }) {
  const bullets = describeStall(score);
  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Stall score</p>
        <span className="rounded px-2 py-0.5 text-xs font-bold text-white" style={{ background: TIER_HEX[score.tier] }}>{score.total} · {score.tier}</span>
      </div>
      {bullets.length > 0 && (
        <ul className="space-y-0.5 text-xs text-foreground">
          {bullets.map((b, i) => <li key={i}>· {b}</li>)}
        </ul>
      )}
      <div className="space-y-0.5">
        {score.components.map((c) => (
          <div key={c.key} className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-16 capitalize">{c.key}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
              <span className="block h-full bg-primary" style={{ width: `${(c.score / c.max) * 100}%` }} />
            </span>
            <span className="w-9 text-right tabular-nums">{Math.round(c.score)}/{c.max}</span>
          </div>
        ))}
      </div>
    </div>
  );
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

export function DesignerInspector({ element, multiCount, stallTypes, score, suggestion, salesView, onChange, onBulkPatch, onApplySuggestions, onRelabel }: Props) {
  if (multiCount > 1) {
    return (
      <aside className="space-y-3 rounded-xl border border-border bg-card p-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{multiCount} selected</h2>
          <p className="text-xs text-muted-foreground">Align/distribute from the toolbar, arrow keys to nudge, or bulk-edit and relabel below.</p>
        </div>
        {salesView && (
          <div className="space-y-2 border-t border-border pt-3">
            <p className="text-xs font-medium text-muted-foreground">Apply price suggestions (§9.2)</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onApplySuggestions("selected")}>To {multiCount} selected</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => onApplySuggestions("zone")}>To zone</Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Sets each stall&apos;s price from its type base × score. You still Save to commit.</p>
          </div>
        )}
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
          {(() => {
            const t = element.stallTypeId ? stallTypes.find((st) => st.id === element.stallTypeId) : undefined;
            if (!t || t.priceInPaise <= 0) return null;
            return element.priceInPaise == null ? (
              <p className="text-xs text-muted-foreground">Using type price: <b className="text-foreground">{fmtRupees(t.priceInPaise)}</b> ({t.name})</p>
            ) : (
              <p className="text-xs text-muted-foreground">Overrides type price {fmtRupees(t.priceInPaise)} ({t.name}) — clear to use it.</p>
            );
          })()}
          {suggestion != null && score && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-dashed border-border bg-muted/40 px-2 py-1.5">
              <span className="text-xs text-muted-foreground">Suggested: <b className="text-foreground">{fmtRupees(suggestion)}</b> (score {score.total})</span>
              <Button size="sm" variant="outline" className="h-7" onClick={() => onChange({ priceInPaise: suggestion })}>Apply</Button>
            </div>
          )}
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Status
            <select value={element.status ?? "AVAILABLE"} onChange={(e) => onChange({ status: e.target.value as EditorElement["status"] })} className={fieldCls}>
              <option value="AVAILABLE">Available</option>
              <option value="BLOCKED">Blocked / reserved</option>
            </select>
          </label>
          {score && <ScoreBreakdown score={score} />}
        </>
      )}
    </aside>
  );
}
