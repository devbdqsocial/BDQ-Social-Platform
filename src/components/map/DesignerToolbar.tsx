"use client";

import { Copy, Download, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type EditorElement } from "@/lib/map/designer-ops";
import { upgradeLayout, type LayoutV2 } from "@/lib/map/layout-v2";

interface Props {
  snap: boolean;
  gridFt: number;
  hasSelection: boolean;
  onSnap: (v: boolean) => void;
  onGrid: (v: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onLoadTemplate: () => void;
  onClear: () => void;
  getLayout: () => LayoutV2;
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
      const v2 = upgradeLayout(JSON.parse(await file.text()));
      props.onImport(v2.elements);
    } catch {
      alert("Could not read that file as JSON.");
    }
  };

  const selectCls =
    "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
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
