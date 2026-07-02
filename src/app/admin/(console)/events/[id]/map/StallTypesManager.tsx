"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import type { StallTypeDef } from "@prisma/client";
import { MoreVertical, Copy, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { saveStallTypeAction, deleteStallTypeAction, duplicateStallTypeAction } from "./actions";

/** Quick-pick swatches (legible, no purple per the admin palette rule). The native colour
 * picker below stays available for anything else. */
const PRESETS = ["#3FA66A", "#2CA6A4", "#3B82F6", "#E07B2C", "#DC2626", "#DB2777", "#CA8A04", "#64748B"];

// One shared column template so the header and every row line up exactly. Driven by an inline
// gridTemplateColumns style (not a Tailwind arbitrary class) so it renders regardless of the build.
const GRID = "grid items-center gap-3";
const COLS = "minmax(9rem,1fr) 9.5rem 6rem 4.5rem 5rem 4.5rem 4.5rem";

export function StallTypesManager({
  eventId,
  types,
  placedByType = {},
}: {
  eventId: string;
  types: StallTypeDef[];
  placedByType?: Record<string, number>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stall types</CardTitle>
        <CardDescription>Custom sizes &amp; prices for this event. Add a type, then drop it on the map from the palette.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="space-y-2" style={{ minWidth: 760 }}>
            <div className={`${GRID} px-1 text-xs font-medium text-muted-foreground`} style={{ gridTemplateColumns: COLS }}>
              <span>Name <span className="text-destructive">*</span></span>
              <span>Size (ft) <span className="text-destructive">*</span></span>
              <span>Price (₹)</span>
              <span>Colour</span>
              <span>Sellable</span>
              <span>On map</span>
              <span className="text-right">Actions</span>
            </div>

            {types.map((t) => (
              <StallTypeRow key={t.id} eventId={eventId} type={t} placed={placedByType[t.id] ?? 0} />
            ))}

            <div className="border-t border-border pt-3">
              <StallTypeRow eventId={eventId} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StallTypeRow({ eventId, type, placed }: { eventId: string; type?: StallTypeDef; placed?: number }) {
  const isNew = !type;
  const [pending, start] = useTransition();

  const [name, setName] = React.useState(type?.name ?? "");
  const [w, setW] = React.useState(String(type?.widthFt ?? 10));
  const [h, setH] = React.useState(String(type?.heightFt ?? 10));
  const [price, setPrice] = React.useState(type ? String(type.priceInPaise / 100) : "");
  const [color, setColor] = React.useState(type?.color ?? PRESETS[0]);
  const [sellable, setSellable] = React.useState(type?.sellable ?? true);

  const reset = () => {
    setName(""); setW("10"); setH("10"); setPrice(""); setColor(PRESETS[0]); setSellable(true);
  };

  const save = () => {
    if (name.trim().length < 1) return toast.error("Give the stall type a name.");
    if (!(Number(w) > 0) || !(Number(h) > 0)) return toast.error("Width and height must be greater than 0.");
    start(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      if (type) fd.set("id", type.id);
      fd.set("name", name.trim());
      fd.set("widthFt", w);
      fd.set("heightFt", h);
      fd.set("priceRupees", price || "0");
      fd.set("color", color);
      if (sellable) fd.set("sellable", "on");
      try {
        await saveStallTypeAction(fd);
        toast.success(isNew ? "Stall type added" : "Stall type saved");
        if (isNew) reset();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Couldn't save the stall type.");
      }
    });
  };

  const duplicate = () => {
    if (!type) return;
    start(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("id", type.id);
      try { await duplicateStallTypeAction(fd); toast.success("Stall type duplicated"); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't duplicate."); }
    });
  };

  const remove = () => {
    if (!type) return;
    start(async () => {
      const fd = new FormData();
      fd.set("eventId", eventId);
      fd.set("id", type.id);
      try { await deleteStallTypeAction(fd); toast.success("Stall type removed"); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Couldn't remove."); }
    });
  };

  const muted = !sellable && !isNew;

  return (
    <div className={`${GRID} rounded-lg px-1 py-1 ${muted ? "opacity-60" : ""}`} style={{ gridTemplateColumns: COLS }} aria-busy={pending}>
      <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" required aria-label="Stall type name" />

      <div className="flex items-center gap-1.5">
        <Input type="number" min={1} step="0.5" value={w} onChange={(e) => setW(e.target.value)} className="w-16" required aria-label="Width in feet" />
        <span className="text-muted-foreground">×</span>
        <Input type="number" min={1} step="0.5" value={h} onChange={(e) => setH(e.target.value)} className="w-16" required aria-label="Height in feet" />
      </div>

      <Input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" aria-label="Price in rupees" />

      <ColorPicker value={color} onChange={setColor} />

      <Switch checked={sellable} onCheckedChange={setSellable} aria-label="Sellable" />

      <span className="text-xs text-muted-foreground">
        {isNew ? "" : (placed ? <Badge variant="neutral">{placed}</Badge> : "—")}
      </span>

      <div className="flex justify-end">
        {isNew ? (
          <Button type="button" size="sm" onClick={save} disabled={pending} aria-label="Add stall type">Add</Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Stall type actions"><MoreVertical className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={save} disabled={pending}><Check className="size-4" /> Save changes</DropdownMenuItem>
              <DropdownMenuItem onClick={duplicate} disabled={pending}><Copy className="size-4" /> Duplicate</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={remove} disabled={pending}><Trash2 className="size-4" /> Remove</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

/** Colour swatch that opens a small palette of presets plus the native picker. */
function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="size-7 rounded-md border border-border"
          style={{ backgroundColor: value }}
          aria-label="Choose colour"
        />
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <div className="grid grid-cols-4 gap-1.5">
          {PRESETS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange(c)}
              className="flex size-7 items-center justify-center rounded-md border border-border"
              style={{ backgroundColor: c }}
              aria-label={`Use ${c}`}
            >
              {value.toLowerCase() === c.toLowerCase() ? <Check className="size-4 text-white" /> : null}
            </button>
          ))}
        </div>
        <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          Custom
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-7 w-10 rounded-md border border-border bg-background" />
        </label>
      </PopoverContent>
    </Popover>
  );
}
