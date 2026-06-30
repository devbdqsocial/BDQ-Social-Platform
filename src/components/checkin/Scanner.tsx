"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { addToQueue, loadQueue, removeFromQueue, saveQueue, type QueuedScan } from "@/lib/scan-queue";

type ResultKind = "VALID" | "ALREADY_USED" | "INVALID" | "QUEUED";
type Result = {
  result: ResultKind;
  holder?: string | null;
  ticketType?: string;
  event?: string;
  admitted?: number;
  remaining?: number;
  admitCount?: number;
  message?: string;
};

const BANNER: Record<ResultKind, { bg: string; fg: string; label: string }> = {
  VALID: { bg: "var(--success)", fg: "#fff", label: "VALID — checked in" },
  ALREADY_USED: { bg: "var(--color-stall-booked)", fg: "#fff", label: "ALREADY USED" },
  INVALID: { bg: "var(--destructive)", fg: "#fff", label: "INVALID" },
  QUEUED: { bg: "var(--warning)", fg: "#15120E", label: "SAVED OFFLINE — will sync" },
};

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

const CHECKIN_ERROR: Record<string, string> = {
  UNAUTHENTICATED: "Sign in again on this device.",
  FORBIDDEN: "This account does not have check-in access.",
  VALIDATION: "That QR payload is not a valid BDQ ticket token.",
};

/** Returns the server Result, or null on a network failure (treat as offline → queue). */
async function postScan(item: QueuedScan): Promise<Result | null> {
  try {
    const res = await fetch("/api/admin/checkin", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(item),
    });
    const json = await res.json();
    if (res.ok && json.ok) return json.data;
    if (res.status >= 500) return null;
    const code = json?.error?.code;
    return {
      result: "INVALID",
      message: CHECKIN_ERROR[code] ?? (res.status === 429 ? "Too many scans from this device. Pause briefly and try again." : "Ticket could not be checked in."),
    };
  } catch {
    return null;
  }
}

export function Scanner() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [manual, setManual] = useState("");
  const [queued, setQueued] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refreshQueued = () => setQueued(loadQueue().length);

  const enqueue = (item: QueuedScan) => {
    saveQueue(addToQueue(loadQueue(), item));
    refreshQueued();
  };

  const syncQueue = async () => {
    const q = loadQueue();
    if (!q.length || syncing) return;
    setSyncing(true);
    let remaining = q;
    for (const item of q) {
      const r = await postScan(item);
      if (r === null) break; // still offline → stop
      remaining = removeFromQueue(remaining, item.clientScanId);
      saveQueue(remaining);
    }
    refreshQueued();
    setSyncing(false);
  };

  useEffect(() => {
    refreshQueued();
    void syncQueue();
    const onOnline = () => void syncQueue();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (qrToken: string) => {
    const token = qrToken.trim();
    if (!token) return;
    setBusy(true);
    const item: QueuedScan = { clientScanId: newId(), qrToken: token };
    try {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        enqueue(item);
        setResult({ result: "QUEUED" });
        return;
      }
      const r = await postScan(item);
      if (r === null) {
        enqueue(item);
        setResult({ result: "QUEUED" });
      } else {
        setResult(r);
        if (navigator.vibrate) navigator.vibrate(r.result === "VALID" ? 80 : [40, 40, 40]);
      }
    } finally {
      setBusy(false);
    }
  };

  const startCamera = async () => {
    setResult(null);
    const { Html5Qrcode } = await import("html5-qrcode");
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;
    setScanning(true);
    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: Math.min(240, Math.floor(window.innerWidth * 0.8)) },
        async (decoded) => {
          await stopCamera();
          await submit(decoded);
        },
        () => {},
      );
    } catch {
      setScanning(false);
      setResult({ result: "INVALID", message: "Camera unavailable. Check browser permission, then use manual entry if needed." });
    }
  };

  const stopCamera = async () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    setScanning(false);
    if (s) {
      try {
        await s.stop();
        s.clear();
      } catch {
        /* already stopped */
      }
    }
  };

  return (
    <div className="space-y-4">
      {(queued > 0 || syncing) && (
        <div className="flex items-center justify-between rounded-lg border border-border bg-card p-3 text-sm">
          <span>{syncing ? "Syncing…" : `${queued} scan(s) queued offline`}</span>
          <Button variant="outline" size="sm" disabled={syncing || queued === 0} onClick={syncQueue}>
            Sync now
          </Button>
        </div>
      )}

      {result && (
        <div
          role="status"
          aria-live="assertive"
          className="rounded-xl p-6 text-center"
          style={{ backgroundColor: BANNER[result.result].bg, color: BANNER[result.result].fg }}
        >
          <p className="font-display text-2xl font-semibold">
            {result.result === "VALID" && (result.admitted ?? 1) > 1
              ? `VALID — ADMIT ${result.admitted}`
              : BANNER[result.result].label}
          </p>
          {result.result === "VALID" && (
            <p className="mt-1 text-sm opacity-90">
              {result.ticketType} · {result.holder ?? "Guest"} · {result.event}
              {(result.remaining ?? 0) > 0 && ` · ${result.remaining} more can still enter on this QR`}
            </p>
          )}
          {result.result !== "VALID" && result.message && <p className="mt-1 text-sm opacity-90">{result.message}</p>}
        </div>
      )}

      <div id="reader" className="overflow-hidden rounded-xl border border-border" />

      <div className="flex flex-wrap gap-2">
        {!scanning ? (
          <Button onClick={startCamera} disabled={busy}>Start camera</Button>
        ) : (
          <Button variant="outline" onClick={stopCamera}>Stop camera</Button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <p className="mb-2 text-sm font-medium">Manual entry (paste a ticket QR token)</p>
        <div className="flex gap-2">
          <input
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            placeholder="payload.signature"
            className="h-10 flex-1 rounded-md border border-border bg-background px-3 text-sm"
          />
          <Button variant="outline" disabled={busy || !manual.trim()} onClick={() => submit(manual)}>
            Check in
          </Button>
        </div>
      </div>
    </div>
  );
}
