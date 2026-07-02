"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KEY_BINDINGS } from "./useDesignerKeyboard";
import { useDesigner } from "./DesignerContext";

/** Keyboard shortcut reference — opened with `?` or the toolbar help button. Renders the same
 * KEY_BINDINGS table the handler runs on. */
export function ShortcutHelp() {
  const { helpOpen, setHelpOpen } = useDesigner();
  return (
    <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>Everything also works from the toolbar — these are just faster.</DialogDescription>
        </DialogHeader>
        <ul className="space-y-1.5 text-sm">
          {KEY_BINDINGS.map((b) => (
            <li key={b.keys} className="flex items-baseline justify-between gap-4">
              <span className="text-muted-foreground">{b.does}</span>
              <kbd className="shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">{b.keys}</kbd>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
