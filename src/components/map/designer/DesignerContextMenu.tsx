"use client";

import { useDesigner } from "./DesignerContext";

const itemCls = "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm text-popover-foreground outline-none hover:bg-accent hover:text-accent-foreground";

/** Right-click menu for canvas objects — plain fixed-position HTML (outside konva). A transparent
 * overlay behind it closes on any outside press or scroll. */
export function DesignerContextMenu() {
  const d = useDesigner();
  const m = d.ctxMenu;
  if (!m) return null;
  const close = () => d.setCtxMenu(null);

  return (
    <>
      <div className="fixed inset-0 z-40" onMouseDown={close} onWheel={close} onContextMenu={(e) => { e.preventDefault(); close(); }} />
      <div
        className="fixed z-50 min-w-44 rounded-md border border-border bg-popover p-1 shadow-md"
        style={{ left: m.x, top: m.y }}
      >
        {m.target.type === "element" ? (
          <>
            <button type="button" className={itemCls} onClick={() => { d.duplicateSelected(); close(); }}>Duplicate</button>
            <button type="button" className={itemCls} onClick={() => { d.bringSelectedToFront(); close(); }}>Bring to front</button>
            <button type="button" className={itemCls} onClick={() => { d.sendSelectedToBack(); close(); }}>Send to back</button>
            <div className="my-1 h-px bg-border" />
            <button type="button" className={`${itemCls} text-destructive hover:text-destructive`} onClick={() => { d.deleteSelected(); close(); }}>Delete</button>
          </>
        ) : (
          <>
            <button type="button" className={itemCls} onClick={() => { if (m.target.type === "obj") d.duplicateObj(m.target.kind, m.target.id); close(); }}>Duplicate</button>
            <div className="my-1 h-px bg-border" />
            <button type="button" className={`${itemCls} text-destructive hover:text-destructive`} onClick={() => { d.deleteSelectedObj(); close(); }}>Delete</button>
          </>
        )}
      </div>
    </>
  );
}
