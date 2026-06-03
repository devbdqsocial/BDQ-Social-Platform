"use client";

import { Copy, Download, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  INFRA_TYPES,
  validateLayout,
  type DesignerLayout,
  type EditorElement,
  type PaletteStallType,
} from "@/lib/map/designer-ops";
import type { SeedInfraType } from "@/server/map/seed-aarush-lawn";

interface Props {
  stallTypes: PaletteStallType[];
  snap: boolean;
  gridFt: number;
  hasSelection: boolean;
  onSnap: (v: boolean) => void;
  onGrid: (v: number) => void;
  onAddStall: (t: PaletteStallType) => void;
  onAddInfra: (t: SeedInfraType) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLoadTemplate: () => void;
  onClear: () => void;
  getLayout: () => DesignerLayout;
  onImport: (els: EditorElement[]) => void;
}

export function DesignerToolbar(props: Props) {
  const onExport = () => {
    const blob = new Blob([JSON.stringify(props.getLayout(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bdq-map.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const res = validateLayout(JSON.parse(await file.text()));
      if (res.ok) props.onImport(res.layout.elements);
      else alert(`Invalid layout: ${res.error}`);
    } catch {
      alert("Could not read that file as JSON.");
    }
  };

  const selectCls =
    "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
      <select
        className={selectCls}
        aria-label="Add stall"
        defaultValue=""
        onChange={(e) => {
          const t = props.stallTypes.find((s) => s.id === e.target.value);
          if (t) props.onAddStall(t);
          e.target.value = "";
        }}
      >
        <option value="" disabled>
          + Add stall
        </option>
        {props.stallTypes.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.widthFt}×{t.heightFt}ft)
          </option>
        ))}
      </select>

      <select
        className={selectCls}
        aria-label="Add infrastructure"
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) props.onAddInfra(e.target.value as SeedInfraType);
          e.target.value = "";
        }}
      >
        <option value="" disabled>
          + Add infra
        </option>
        {INFRA_TYPES.map((t) => (
          <option key={t} value={t}>
            {t.replace(/_/g, " ")}
          </option>
        ))}
      </select>

      <Button variant="outline" size="sm" disabled={!props.hasSelection} onClick={props.onDuplicate}>
        <Copy className="size-4" /> Duplicate
      </Button>
      <Button variant="outline" size="sm" disabled={!props.hasSelection} onClick={props.onDelete}>
        <Trash2 className="size-4" /> Delete
      </Button>

      <span className="mx-1 h-6 w-px bg-border" />

      <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <input type="checkbox" checked={props.snap} onChange={(e) => props.onSnap(e.target.checked)} />
        Snap
      </label>
      <select
        className={selectCls}
        aria-label="Grid size"
        value={props.gridFt}
        onChange={(e) => props.onGrid(Number(e.target.value))}
      >
        {[1, 2, 5, 10].map((g) => (
          <option key={g} value={g}>
            {g} ft grid
          </option>
        ))}
      </select>

      <span className="mx-1 h-6 w-px bg-border" />

      <Button variant="ghost" size="sm" onClick={props.onLoadTemplate}>
        Load sample layout
      </Button>
      <Button variant="ghost" size="sm" onClick={props.onClear}>
        Clear
      </Button>
      <Button variant="outline" size="sm" onClick={onExport}>
        <Download className="size-4" /> Export
      </Button>
      <Button variant="outline" size="sm" asChild>
        <label className="cursor-pointer">
          <Upload className="size-4" /> Import
          <input type="file" accept="application/json" className="hidden" onChange={onFile} />
        </label>
      </Button>
    </div>
  );
}
