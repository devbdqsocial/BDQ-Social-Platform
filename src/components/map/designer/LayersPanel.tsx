"use client";

import { Eye, EyeOff, Lock, LockOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDesigner } from "./DesignerContext";
import { LAYER_IDS, LAYER_LABELS } from "./useDesignerState";

/**
 * Layers panel (build-plan R2.5.5, design-system §4.8) — Figma-style show/hide/lock per layer
 * with live counts. Drives canvas render gating + interaction locking via the store. The 9 fixed
 * layers map to map-system §1; empty ones (terrain/ops/entry-flow) stay listed for future content.
 */
export function LayersPanel() {
  const { layers, layerCounts, toggleLayerVisible, toggleLayerLock, setAllLayersVisible } = useDesigner();
  const allVisible = LAYER_IDS.every((id) => layers[id].visible);

  return (
    <div className="space-y-1.5 rounded-xl border border-border bg-card p-4 text-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">Layers</h2>
        <Button variant="ghost" size="sm" onClick={() => setAllLayersVisible(!allVisible)}>
          {allVisible ? "Hide all" : "Show all"}
        </Button>
      </div>
      <ul>
        {LAYER_IDS.map((id) => {
          const st = layers[id];
          const count = layerCounts[id];
          return (
            <li key={id} className="flex h-9 items-center gap-2">
              <button
                type="button"
                aria-label={st.visible ? `Hide ${LAYER_LABELS[id]}` : `Show ${LAYER_LABELS[id]}`}
                aria-pressed={st.visible}
                onClick={() => toggleLayerVisible(id)}
                className="grid size-6 place-items-center rounded text-muted-foreground hover:text-foreground"
              >
                {st.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </button>
              <span className={`flex-1 truncate ${st.visible ? "" : "text-muted-foreground/60"}`}>{LAYER_LABELS[id]}</span>
              <span className="w-6 text-right text-xs tabular-nums text-muted-foreground">{count || ""}</span>
              <button
                type="button"
                aria-label={st.locked ? `Unlock ${LAYER_LABELS[id]}` : `Lock ${LAYER_LABELS[id]}`}
                aria-pressed={st.locked}
                onClick={() => toggleLayerLock(id)}
                className={`grid size-6 place-items-center rounded hover:text-foreground ${st.locked ? "text-foreground" : "text-muted-foreground/50"}`}
              >
                {st.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
