"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Wifi, WifiOff } from "lucide-react";
import { ScannerLoader } from "@/components/checkin/ScannerLoader";

type WakeLockNav = Navigator & { wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> } };

const EXIT_HOLD_MS = 3000;

/** Fullscreen, unattended kiosk shell around the scanner: wake-lock, offline badge, 3s-hold exit. */
export function KioskClient({ gate }: { gate: string }) {
  const router = useRouter();
  const [online, setOnline] = useState(true);
  const [holdPct, setHoldPct] = useState(0);
  const holdTimer = useRef<number | null>(null);
  const holdStart = useRef(0);

  // Online/offline badge.
  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  // Screen wake-lock — re-acquired when the tab becomes visible again.
  useEffect(() => {
    let sentinel: { release(): Promise<void> } | null = null;
    let cancelled = false;
    const acquire = async () => {
      try {
        const wl = (navigator as WakeLockNav).wakeLock;
        if (wl && document.visibilityState === "visible") sentinel = await wl.request("screen");
      } catch {
        /* wake-lock unsupported or blocked — kiosk still works */
      }
    };
    const onVisible = () => { if (document.visibilityState === "visible" && !cancelled) void acquire(); };
    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release();
    };
  }, []);

  const exit = useCallback(() => {
    document.exitFullscreen?.().catch(() => {});
    router.push("/admin/ops/checkin");
  }, [router]);

  const stopHold = () => {
    if (holdTimer.current) cancelAnimationFrame(holdTimer.current);
    holdTimer.current = null;
    setHoldPct(0);
  };
  const startHold = () => {
    holdStart.current = performance.now();
    const tick = (now: number) => {
      const pct = Math.min(1, (now - holdStart.current) / EXIT_HOLD_MS);
      setHoldPct(pct);
      if (pct >= 1) { stopHold(); exit(); return; }
      holdTimer.current = requestAnimationFrame(tick);
    };
    holdTimer.current = requestAnimationFrame(tick);
  };

  return (
    <div className="admin flex min-h-[100svh] flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Kiosk · check-in</p>
          <p className="truncate font-display text-lg font-semibold">{gate}</p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${online ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}
        >
          {online ? <Wifi className="size-4" /> : <WifiOff className="size-4" />}
          {online ? "Online" : "Offline — saving scans"}
        </span>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 p-4">
        <ScannerLoader />
      </main>

      <footer className="border-t border-border p-4">
        <button
          type="button"
          onPointerDown={startHold}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          onPointerCancel={stopHold}
          className="relative w-full overflow-hidden rounded-lg border border-border bg-card py-3 text-sm font-medium text-muted-foreground"
        >
          <span className="absolute inset-y-0 left-0 bg-destructive/20" style={{ width: `${holdPct * 100}%` }} aria-hidden />
          <span className="relative">{holdPct > 0 ? "Keep holding to exit…" : "Hold 3s to exit kiosk"}</span>
        </button>
      </footer>
    </div>
  );
}
