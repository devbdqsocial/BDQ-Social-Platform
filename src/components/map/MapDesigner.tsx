"use client";

import type { CanvasMeta, EditorElement, PaletteStallType } from "@/lib/map/designer-ops";
import type { LayoutV2 } from "@/lib/map/layout-v2";
import type { UploadSignature } from "@/lib/cloudinary";
import { useDesignerState } from "./designer/useDesignerState";
import { useDesignerKeyboard } from "./designer/useDesignerKeyboard";
import { DesignerProvider } from "./designer/DesignerContext";
import { DesignerControls, DesignerStatusBar } from "./designer/DesignerControls";
import { DesignerCanvas } from "./designer/DesignerCanvas";
import { DesignerSidePanels } from "./designer/DesignerSidePanels";
import { LayersPanel } from "./designer/LayersPanel";
import { DesignerInspector } from "./DesignerInspector";
import { SummaryPanel } from "./SummaryPanel";
import { BulkGridDialog } from "./BulkGridDialog";
import { CalibrationModal } from "./CalibrationModal";
import { makeGrid, relabel, bulkPatch } from "@/lib/map/designer-actions";

export interface MapDesignerProps {
  eventId?: string;
  initialElements?: EditorElement[];
  initialCanvas?: CanvasMeta;
  /** full upgraded layout — the designer round-trips its v2 sub-collections (boundary/zones/…). */
  initialLayout?: LayoutV2;
  stallTypes?: PaletteStallType[];
  saveAction?: (eventId: string, layout: LayoutV2) => Promise<void>;
  uploadAction?: () => Promise<UploadSignature>;
}

/**
 * Map Designer — orchestration only (build-plan R2.5.5). `useDesignerState` is the single source
 * of truth; `DesignerProvider` shares it; the panels render + wire themselves via `useDesigner()`.
 * Add a feature by adding a slice to the hook + a panel here — never back into one giant file.
 */
export default function MapDesigner(props: MapDesignerProps = {}) {
  const d = useDesignerState(props);
  useDesignerKeyboard(d);
  const { commit, selected, selectedIds, patchOne, elements, stallTypes, zones, canvas, addElements } = d;

  return (
    <DesignerProvider value={d}>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="space-y-3">
          <DesignerControls />
          <DesignerCanvas />
          <DesignerStatusBar />
        </div>

        <div className="space-y-4">
          <LayersPanel />
          <DesignerInspector
            element={selected}
            multiCount={selectedIds.size}
            stallTypes={stallTypes}
            score={d.selectedScore}
            onChange={(p) => selected && commit(patchOne(selected.id, p))}
            onBulkPatch={(p) => { if (selectedIds.size) commit(bulkPatch(elements, selectedIds, p)); }}
            onRelabel={(prefix, start) => { if (selectedIds.size) commit(relabel(elements, selectedIds, prefix, start)); }}
          />
          <SummaryPanel elements={elements} stallTypes={stallTypes} zones={zones} venueSqFt={canvas.widthFt * canvas.heightFt} />
          <DesignerSidePanels />
        </div>

        {d.bulkOpen && (
          <BulkGridDialog
            stallTypes={stallTypes}
            onClose={() => d.setBulkOpen(false)}
            onCreate={(type, opts) => { addElements(makeGrid(type, opts)); d.setBulkOpen(false); }}
          />
        )}

        {d.calibrating && canvas.bgImage && (
          <CalibrationModal
            url={canvas.bgImage.url}
            knownVenueFt={{ widthFt: canvas.widthFt, heightFt: canvas.heightFt }}
            onApply={d.applyCalibration}
            onClose={() => d.setCalibrating(false)}
          />
        )}
      </div>
    </DesignerProvider>
  );
}
