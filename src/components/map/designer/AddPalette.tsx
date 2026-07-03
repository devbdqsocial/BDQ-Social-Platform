"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { buildCatalog, type PlaceKind } from "@/lib/map/catalog";
import { useDesigner } from "./DesignerContext";

const CATALOG = buildCatalog();

/** The one "Add" palette: stalls (from the event's types) + every placeable object, categorized
 * in flea-market language. Picking an item arms ghost placement — click the map to stamp. */
export function AddPalette() {
  const d = useDesigner();

  const add = (kind: PlaceKind, key: string, label: string) => d.armPlacement({ kind, key, label });

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-2">
      <span className="px-1 text-xs font-medium text-muted-foreground"><Plus className="inline size-3.5" /> Add</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Stalls</Button></DropdownMenuTrigger>
        {/* w-auto overrides the primitive's trigger-width sizing so labels never wrap */}
        <DropdownMenuContent align="start" className="w-auto min-w-48">
          {d.stallTypes.length === 0 && <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">No stall types yet — create them above.</DropdownMenuLabel>}
          {d.stallTypes.map((t) => (
            <DropdownMenuItem key={t.id} className="whitespace-nowrap" onClick={() => d.armPlacement({ kind: "stall", key: t.id, label: t.name, stallType: t })}>
              {t.name} <span className="ml-auto pl-3 text-xs text-muted-foreground">{t.widthFt}×{t.heightFt} ft</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {CATALOG.map((cat) => (
        <DropdownMenu key={cat.category}>
          <DropdownMenuTrigger asChild><Button variant="outline" size="sm">{cat.category}</Button></DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-auto min-w-48">
            {cat.kind === "ops" && <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">Shown to your team only</DropdownMenuLabel>}
            {cat.items.map((item) => (
              <DropdownMenuItem key={item.key} className="whitespace-nowrap" onClick={() => add(cat.kind, item.key, item.label)}>{item.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </div>
  );
}
