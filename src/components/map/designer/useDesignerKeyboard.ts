"use client";

import { useEffect } from "react";
import type { DesignerApi } from "./useDesignerState";

/**
 * Global keyboard shortcuts for the designer (build-plan R2.5.5). Effect-only; reads the store.
 * Ignores typing in form fields. KEY_BINDINGS is the single table both this handler and the
 * ShortcutHelp dialog render from, so help can't drift from behavior.
 */
export const KEY_BINDINGS: { keys: string; does: string }[] = [
  { keys: "V", does: "Select tool" },
  { keys: "H", does: "Pan tool" },
  { keys: "M", does: "Measure distance" },
  { keys: "B", does: "Draw plot boundary" },
  { keys: "Z", does: "Draw zone" },
  { keys: "P", does: "Draw pathway" },
  { keys: "T", does: "Paint terrain" },
  { keys: "S", does: "Toggle sales view" },
  { keys: "Shift (drawing / dragging a point)", does: "Constrain to straight lines" },
  { keys: "Enter or double-click", does: "Finish drawing" },
  { keys: "Esc", does: "Cancel drawing / point editing / selection" },
  { keys: "Ctrl+Z · Ctrl+Shift+Z or Ctrl+Y", does: "Undo · redo" },
  { keys: "Ctrl+C · Ctrl+V · Ctrl+D", does: "Copy · paste · duplicate" },
  { keys: "Delete / Backspace", does: "Delete selection" },
  { keys: "Arrows · Shift+Arrows", does: "Nudge 1 ft · 10 ft" },
  { keys: "] · [", does: "Bring to front · send to back" },
  { keys: "Shift-click or drag on empty canvas", does: "Multi-select" },
  { keys: "/", does: "Focus search" },
  { keys: "?", does: "This help" },
];

export function useDesignerKeyboard(d: DesignerApi) {
  const {
    elements, selectedIds, setSelectedIds, undo, redo, commit, copySelected, pasteClipboard,
    duplicateSelected, deleteSelected, nudgeSelected, selectTool, setSalesView,
    setMeasurePts, setMeasureCursor, setDrawing, drawing, tool, finishDrawing, isClosed,
  } = d;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
      if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      if (mod && e.key.toLowerCase() === "c") { copySelected(); return; }
      if (mod && e.key.toLowerCase() === "v") { e.preventDefault(); pasteClipboard(); return; }
      if (mod && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelected(); return; }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelected(); return; }
      if (!mod) {
        const k = e.key.toLowerCase();
        if (k === "m") { selectTool("measure"); return; }
        if (k === "b") { selectTool("boundary"); return; }
        if (k === "z") { selectTool("zone"); return; }
        if (k === "p") { selectTool("pathway"); return; }
        if (k === "t") { selectTool("terrain"); return; }
        if (k === "v") { selectTool("select"); return; }
        if (k === "h") { selectTool("pan"); return; }
        if (k === "s") { setSalesView((prev) => !prev); return; }
        if (e.key === "?") { d.setHelpOpen((v) => !v); return; }
        if (e.key === "]") { d.bringSelectedToFront(); return; }
        if (e.key === "[") { d.sendSelectedToBack(); return; }
        if (e.key === "/") { e.preventDefault(); document.getElementById("designer-search")?.focus(); return; }
        if (e.key === "Enter" && drawing && drawing.length >= (isClosed(tool) ? 3 : 2)) { finishDrawing(drawing); return; }
        if (e.key === "Escape") { setMeasurePts([]); setMeasureCursor(null); setDrawing(null); setSelectedIds(new Set()); d.setVertexEdit(null); return; }
      }
      const step = e.shiftKey ? 10 : 1;
      const dir = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
      if (dir && selectedIds.size) { e.preventDefault(); nudgeSelected(dir[0], dir[1]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // The store callbacks are recreated per render but always current; re-bind on the reactive
    // bits the handler branches on (drawing/tool/selection) — listing every setter is noise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elements, selectedIds, drawing, tool, undo, redo, commit, deleteSelected, finishDrawing]);
}
