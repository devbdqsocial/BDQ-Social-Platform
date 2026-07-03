"use client";

import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { buildCatalog } from "@/lib/map/catalog";
import { createInfra, createStall } from "@/lib/map/designer-ops";
import type { EntryType, OpsType } from "@/lib/map/entry-ops";
import type { Obstacle } from "@/lib/map/layout-v2";
import type { SeedInfraType } from "@/server/map/seed-aarush-lawn";
import { useDesigner } from "./DesignerContext";

const CATALOG = buildCatalog();

/** The one "Add" palette: stalls (from the event's types) + every placeable object, categorized
 * in flea-market language. Replaces the old scattered selects/dropdown buttons. */
export function AddPalette() {
  const d = useDesigner();

  const add = (kind: string, key: string) => {
    if (kind === "infra") d.addElements([createInfra(key as SeedInfraType)]);
    else if (kind === "entry") d.addEntry(key as EntryType);
    else if (kind === "ops") d.addOps(key as OpsType);
    else if (kind === "obstacle") d.addObstacle(key as Obstacle["type"]);
    else if (kind === "annotation") d.addAnnotation(key as "ARROW" | "TEXT");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-2">
      <span className="px-1 text-xs font-medium text-muted-foreground"><Plus className="inline size-3.5" /> Add</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="outline" size="sm">Stalls</Button></DropdownMenuTrigger>
        {/* w-auto overrides the primitive's trigger-width sizing so labels never wrap */}
        <DropdownMenuContent align="start" className="w-auto min-w-48">
          {d.stallTypes.length === 0 && <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">No stall types yet — create them above.</DropdownMenuLabel>}
          {d.stallTypes.map((t) => (
            <DropdownMenuItem key={t.id} className="whitespace-nowrap" onClick={() => d.addElements([createStall(t)])}>
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
              <DropdownMenuItem key={item.key} className="whitespace-nowrap" onClick={() => add(cat.kind, item.key)}>{item.label}</DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ))}
    </div>
  );
}
