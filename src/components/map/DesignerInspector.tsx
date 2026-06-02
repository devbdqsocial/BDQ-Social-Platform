"use client";

import type { EditorElement } from "@/lib/map/designer-ops";

interface Props {
  element: EditorElement | null;
  onChange: (patch: Partial<EditorElement>) => void;
}

function NumberField({
  label,
  value,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
      {label}
      <input
        type="number"
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
      />
    </label>
  );
}

export function DesignerInspector({ element, onChange }: Props) {
  if (!element) {
    return (
      <aside className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        Select an element to edit it. Drag to move, use the corner handles to resize. Sizes are in
        feet; prices are entered per stall.
      </aside>
    );
  }

  const isStall = element.kind === "stall";
  const rupees = element.priceInPaise != null ? element.priceInPaise / 100 : "";

  return (
    <aside className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div>
        <h2 className="font-display text-lg font-semibold">Inspector</h2>
        <p className="text-xs text-muted-foreground">
          {element.kind} · {element.type}
        </p>
      </div>

      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Label
        <input
          value={element.label}
          onChange={(e) => onChange({ label: e.target.value })}
          className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <NumberField label="X (ft)" value={element.xFt} onChange={(v) => onChange({ xFt: v })} />
        <NumberField label="Y (ft)" value={element.yFt} onChange={(v) => onChange({ yFt: v })} />
        <NumberField label="Width (ft)" value={element.widthFt} onChange={(v) => onChange({ widthFt: Math.max(1, v) })} />
        <NumberField label="Height (ft)" value={element.heightFt} onChange={(v) => onChange({ heightFt: Math.max(1, v) })} />
        <NumberField label="Rotation (°)" value={element.rotation} onChange={(v) => onChange({ rotation: v })} />
      </div>

      {isStall && (
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Price (₹) — admin-entered
          <input
            type="number"
            min={0}
            step={1}
            value={rupees}
            placeholder="e.g. 15000"
            onChange={(e) =>
              onChange({
                priceInPaise: e.target.value === "" ? undefined : Math.round(Number(e.target.value) * 100),
              })
            }
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
          />
        </label>
      )}
    </aside>
  );
}
