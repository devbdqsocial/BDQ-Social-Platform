"use client";

import { createContext, useContext } from "react";
import type { DesignerApi } from "./useDesignerState";

/**
 * Designer store context (build-plan R2.5.5). The orchestrator builds the api with
 * `useDesignerState` and provides it; every panel/component reads it via `useDesigner()`.
 * New features add a slice to the hook + a panel that calls `useDesigner()` — no prop drilling.
 */
const DesignerContext = createContext<DesignerApi | null>(null);

export function DesignerProvider({ value, children }: { value: DesignerApi; children: React.ReactNode }) {
  return <DesignerContext.Provider value={value}>{children}</DesignerContext.Provider>;
}

export function useDesigner(): DesignerApi {
  const ctx = useContext(DesignerContext);
  if (!ctx) throw new Error("useDesigner must be used within a DesignerProvider");
  return ctx;
}
