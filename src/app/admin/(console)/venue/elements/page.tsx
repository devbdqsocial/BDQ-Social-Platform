import type { Metadata } from "next";
import type { MapElement } from "@prisma/client";
import { requireAdminRole } from "@/server/auth/guard";
import { ensureElementDefaults } from "@/server/map/elements";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { saveElementAction, deleteElementAction } from "./actions";

export const metadata: Metadata = { title: "Map Elements" };

const inputCls = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

function ElementFields({ el }: { el?: MapElement }) {
  return (
    <>
      <input name="name" defaultValue={el?.name ?? ""} required placeholder="Name" className={`${inputCls} min-w-32 flex-1`} />
      <select name="kind" defaultValue={el?.kind ?? "STALL"} className={`${inputCls} w-24`} aria-label="Kind">
        <option value="STALL">Stall</option>
        <option value="INFRA">Infra</option>
      </select>
      <input name="widthFt" type="number" min={1} step="0.5" defaultValue={el?.widthFt ?? 10} required className={`${inputCls} w-16`} aria-label="Width ft" />
      <span className="self-center text-muted-foreground">×</span>
      <input name="heightFt" type="number" min={1} step="0.5" defaultValue={el?.heightFt ?? 10} required className={`${inputCls} w-16`} aria-label="Height ft" />
      <span className="self-center text-xs text-muted-foreground">ft</span>
      <input name="color" type="color" defaultValue={el?.color ?? "#3FA66A"} className="h-9 w-10 rounded-md border border-border bg-background" aria-label="Colour" />
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input name="sellable" type="checkbox" defaultChecked={el?.sellable ?? true} /> Sellable
      </label>
    </>
  );
}

export default async function MapElementsPage() {
  await requireAdminRole();
  const elements = await ensureElementDefaults();

  return (
    <div className="space-y-6">
      <PageHeader title="Map Elements" description="Reusable stall sizes + infrastructure (stage, lane, water…) you drop onto any map. Sizes are in feet, true-to-scale." />
      
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Catalog ({elements.length})</h2>
          <p className="text-sm text-muted-foreground">Edit a row to update it, or add a new element below. These are shared across all maps.</p>
        </div>
        <div className="space-y-3">
          {elements.map((el) => (
            <div key={el.id} className="flex flex-wrap items-center gap-2">
              <form action={saveElementAction} className="flex flex-1 flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={el.id} />
                <Badge variant={el.kind === "STALL" ? "success" : "neutral"}>{el.kind === "STALL" ? "Stall" : "Infra"}</Badge>
                <ElementFields el={el} />
                <Button type="submit" variant="outline" size="sm">Save</Button>
              </form>
              <form action={deleteElementAction}>
                <input type="hidden" name="id" value={el.id} />
                <Button type="submit" variant="ghost" size="sm">Remove</Button>
              </form>
            </div>
          ))}

          <form action={saveElementAction} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <ElementFields />
            <Button type="submit" size="sm">Add element</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
