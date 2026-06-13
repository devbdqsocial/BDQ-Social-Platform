"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatPaise } from "@/lib/utils";
import { versionStats, type VersionSnapshot } from "@/lib/map/versions";
import { useDesigner } from "./DesignerContext";

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Named snapshots: save / restore-as-commit / compare (stat diff + ghost overlay). map-system §9. */
export function VersionsPanel() {
  const { versions, versionCap, saveVersion, restoreVersion, deleteVersion, compareId, setCompareId, compareDiff } = useDesigner();
  const [name, setName] = useState("");

  return (
    <aside className="space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
      <h2 className="font-display text-base font-semibold">Versions</h2>

      <div className="flex items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-xs text-muted-foreground">
          Snapshot name
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Layout A" className="h-9 rounded-md border border-border bg-background px-2 text-sm" />
        </label>
        <Button size="sm" variant="outline" disabled={!versionCap.canSave} onClick={() => { saveVersion(name); setName(""); }}>Save</Button>
      </div>
      {versionCap.warn && <p className="text-[11px] text-amber-600">{versionCap.warn}</p>}

      {versions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No saved versions yet. Save a snapshot to compare layouts or roll back.</p>
      ) : (
        <ul className="space-y-2">
          {versions.map((v) => {
            const st = versionStats(v.data as VersionSnapshot);
            const isCmp = compareId === v.id;
            return (
              <li key={v.id} className="rounded-md border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate font-medium">{v.name}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{fmtDate(v.createdAt)}</span>
                </div>
                <p className="text-[11px] text-muted-foreground">{st.stalls} stalls · {formatPaise(st.valuePaise)}</p>
                <div className="mt-1.5 flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => restoreVersion(v.id)}>Restore</Button>
                  <Button size="sm" variant={isCmp ? "secondary" : "ghost"} className="h-7 px-2 text-xs" onClick={() => setCompareId(isCmp ? null : v.id)}>{isCmp ? "Comparing" : "Compare"}</Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive" onClick={() => deleteVersion(v.id)}>Delete</Button>
                </div>
                {isCmp && compareDiff && (
                  <p className="mt-1 border-t border-border pt-1 text-[11px] text-muted-foreground">
                    vs now: <b className="text-foreground">{signed(compareDiff.stalls)}</b> stalls · <b className="text-foreground">{compareDiff.valuePaise >= 0 ? "+" : "−"}{formatPaise(Math.abs(compareDiff.valuePaise))}</b>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {compareId && <p className="text-[11px] text-muted-foreground">Ghost overlay shows the compared version behind the current layout.</p>}
    </aside>
  );
}
