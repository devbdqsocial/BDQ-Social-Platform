"use client";

import { useState } from "react";
import type { PaletteStallType } from "@/lib/map/designer-ops";
import type { GridOpts } from "@/lib/map/designer-actions";
import { Button } from "@/components/ui/button";

const cls = "h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground";

function Num({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <input type="number" min={min} value={value} onChange={(e) => onChange(Number(e.target.value))} className={cls} />
    </label>
  );
}

export function BulkGridDialog({
  stallTypes,
  onClose,
  onCreate,
}: {
  stallTypes: PaletteStallType[];
  onClose: () => void;
  onCreate: (type: PaletteStallType, opts: GridOpts) => void;
}) {
  const [typeId, setTypeId] = useState(stallTypes[0]?.id ?? "");
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(4);
  const [gapFt, setGapFt] = useState(3);
  const [startXFt, setStartXFt] = useState(10);
  const [startYFt, setStartYFt] = useState(10);
  const [prefix, setPrefix] = useState("A-");
  const [start, setStart] = useState(1);
  const type = stallTypes.find((t) => t.id === typeId);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div>
          <h2 className="font-display text-lg font-semibold">Bulk stall grid</h2>
          <p className="text-sm text-muted-foreground">Place a numbered block of one stall type.</p>
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Stall type
          <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={cls}>
            {stallTypes.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.widthFt}×{t.heightFt}ft)</option>)}
          </select>
        </label>
        <div className="grid grid-cols-3 gap-3">
          <Num label="Rows" value={rows} onChange={setRows} min={1} />
          <Num label="Columns" value={cols} onChange={setCols} min={1} />
          <Num label="Gap (ft)" value={gapFt} onChange={setGapFt} />
          <Num label="Start X (ft)" value={startXFt} onChange={setStartXFt} />
          <Num label="Start Y (ft)" value={startYFt} onChange={setStartYFt} />
          <Num label="Number from" value={start} onChange={setStart} />
        </div>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Label prefix
          <input value={prefix} onChange={(e) => setPrefix(e.target.value)} className={cls} placeholder="A-" />
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={!type || rows < 1 || cols < 1}
            onClick={() => type && onCreate(type, { rows, cols, gapFt, startXFt, startYFt, prefix, start })}
          >
            Create {rows * cols} stalls
          </Button>
        </div>
      </div>
    </div>
  );
}
