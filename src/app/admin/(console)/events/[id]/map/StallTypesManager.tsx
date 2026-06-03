import type { StallTypeDef } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { saveStallTypeAction, deleteStallTypeAction } from "./actions";

const inputCls = "h-9 w-full rounded-md border border-border bg-background px-2 text-sm text-foreground";

function TypeFields({ t }: { t?: StallTypeDef }) {
  return (
    <>
      <input name="name" defaultValue={t?.name ?? ""} required placeholder="Name" className={`${inputCls} min-w-32 flex-1`} />
      <input name="widthFt" type="number" min={1} step="0.5" defaultValue={t?.widthFt ?? 10} required className={`${inputCls} w-16`} aria-label="Width ft" />
      <span className="self-center text-muted-foreground">×</span>
      <input name="heightFt" type="number" min={1} step="0.5" defaultValue={t?.heightFt ?? 10} required className={`${inputCls} w-16`} aria-label="Height ft" />
      <input name="priceRupees" type="number" min={0} defaultValue={t ? t.priceInPaise / 100 : ""} placeholder="₹" className={`${inputCls} w-24`} aria-label="Price rupees" />
      <input name="color" type="color" defaultValue={t?.color ?? "#3FA66A"} className="h-9 w-10 rounded-md border border-border bg-background" aria-label="Colour" />
      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input name="sellable" type="checkbox" defaultChecked={t?.sellable ?? true} /> Sellable
      </label>
    </>
  );
}

export function StallTypesManager({ eventId, types }: { eventId: string; types: StallTypeDef[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stall types</CardTitle>
        <CardDescription>Custom sizes &amp; prices for this event. Add a type, then drop it on the map from the palette.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {types.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-2">
            <form action={saveStallTypeAction} className="flex flex-1 flex-wrap items-center gap-2">
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="id" value={t.id} />
              <TypeFields t={t} />
              <Button type="submit" variant="outline" size="sm">Save</Button>
            </form>
            <form action={deleteStallTypeAction}>
              <input type="hidden" name="eventId" value={eventId} />
              <input type="hidden" name="id" value={t.id} />
              <Button type="submit" variant="ghost" size="sm">Remove</Button>
            </form>
          </div>
        ))}

        <form action={saveStallTypeAction} className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <input type="hidden" name="eventId" value={eventId} />
          <TypeFields />
          <Button type="submit" size="sm">Add type</Button>
        </form>
      </CardContent>
    </Card>
  );
}
