"use client";

import type { CanvasMeta, EditorElement, PaletteStallType } from "@/lib/map/designer-ops";
import type { LayoutV2 } from "@/lib/map/layout-v2";
import type { UploadSignature } from "@/lib/cloudinary";
import { useDesignerState } from "./designer/useDesignerState";
import { useDesignerKeyboard } from "./designer/useDesignerKeyboard";
import { DesignerProvider } from "./designer/DesignerContext";
import { DesignerControls, DesignerStatusBar } from "./designer/DesignerControls";
import { DesignerCanvas } from "./designer/DesignerCanvas";
import { PlotSetupCard } from "./designer/PlotSetupCard";
import { polygonArea } from "@/lib/map/geometry";
import { DesignerSidePanels } from "./designer/DesignerSidePanels";
import { LayersPanel } from "./designer/LayersPanel";
import { HeatmapLegend } from "./designer/HeatmapLegend";
import { VersionsPanel } from "./designer/VersionsPanel";
import { ValidationPanel } from "./designer/ValidationPanel";
import { DesignerInspector } from "./DesignerInspector";
import { SummaryPanel } from "./SummaryPanel";
import { BulkGridDialog } from "./BulkGridDialog";
import { CalibrationModal } from "./CalibrationModal";
import { ShortcutHelp } from "./designer/ShortcutHelp";
import { makeGrid, relabel, bulkPatch } from "@/lib/map/designer-actions";

export interface MapDesignerProps {
  eventId?: string;
  initialElements?: EditorElement[];
  initialCanvas?: CanvasMeta;
  /** full upgraded layout — the designer round-trips its v2 sub-collections (boundary/zones/…). */
  initialLayout?: LayoutV2;
  stallTypes?: PaletteStallType[];
  /** Σ of the event's ticket-type totalQty — real attendance for the throughput verdict. */
  expectedAttendance?: number;
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
          {!d.boundary && elements.length === 0 && <PlotSetupCard />}
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
            suggestion={d.suggestion}
            salesView={d.salesView}
            obj={d.selectedObjData}
            onObjChange={(p) => d.selectedObj && d.patchObj(d.selectedObj.kind, d.selectedObj.id, p)}
            onObjDelete={d.deleteSelectedObj}
            onChange={(p) => selected && commit(patchOne(selected.id, p))}
            onBulkPatch={(p) => { if (selectedIds.size) commit(bulkPatch(elements, selectedIds, p)); }}
            onApplySuggestions={d.applySuggestions}
            onRelabel={(prefix, start) => { if (selectedIds.size) commit(relabel(elements, selectedIds, prefix, start)); }}
            onBringToFront={d.bringSelectedToFront}
            onSendToBack={d.sendSelectedToBack}
          />
          <HeatmapLegend />
          <SummaryPanel
            elements={elements}
            stallTypes={stallTypes}
            zones={zones}
            venueSqFt={d.boundary ? polygonArea(d.boundary) : canvas.widthFt * canvas.heightFt}
            isPlot={!!d.boundary}
            unit={d.displayUnit}
          />
          <ValidationPanel />
          <VersionsPanel />
          <DesignerSidePanels />
        </div>

        {d.bulkOpen && (
          <BulkGridDialog
            stallTypes={stallTypes}
            onClose={() => d.setBulkOpen(false)}
            onCreate={(type, opts) => {
              // snap the grid's origin so bulk-created stalls land on the drawing grid
              const snap = (v: number) => Math.round(v / d.gridFt) * d.gridFt;
              addElements(makeGrid(type, { ...opts, startXFt: snap(opts.startXFt), startYFt: snap(opts.startYFt) }));
              d.setBulkOpen(false);
            }}
          />
        )}

        <ShortcutHelp />

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
