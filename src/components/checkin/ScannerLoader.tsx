"use client";
import dynamic from "next/dynamic";

export const ScannerLoader = dynamic(() => import("./Scanner").then((m) => ({ default: m.Scanner })), {
  ssr: false,
  loading: () => <div className="flex h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">Loading scanner…</div>,
});
