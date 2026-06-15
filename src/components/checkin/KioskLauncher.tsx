"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/** Kiosk launcher (admin-portal §7 / mobile.md §6): name the gate, go fullscreen, start scanning. */
export function KioskLauncher() {
  const router = useRouter();
  const [gate, setGate] = useState("");

  const start = () => {
    const label = gate.trim() || "Main Gate";
    // Fullscreen needs this user gesture; it persists across the client navigation.
    document.documentElement.requestFullscreen?.().catch(() => {});
    router.push(`/admin/kiosk?gate=${encodeURIComponent(label)}`);
  };

  return (
    <div className="mx-auto mt-20 max-w-sm space-y-5 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">Kiosk mode</h1>
        <p className="mt-1 text-sm text-muted-foreground">Name this gate, then start the fullscreen scanner. Exit with a 3-second press.</p>
      </div>
      <input
        value={gate}
        onChange={(e) => setGate(e.target.value)}
        placeholder="Gate label (e.g. Main Gate, Gate B)"
        className="h-11 w-full rounded-md border border-border bg-background px-3 text-center"
        onKeyDown={(e) => e.key === "Enter" && start()}
      />
      <Button className="w-full" onClick={start}>Start kiosk</Button>
    </div>
  );
}
