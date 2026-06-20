"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { digitsCapped } from "@/lib/validators";

type StartResult = { secret: string; otpauthUrl: string; qrDataUrl: string };

/**
 * Self-service authenticator enrolment, reused by the profile Security panel, the invite accept page, and
 * first-login setup. Flow: fetch a QR (start) → user scans → confirm a current code → reveal one-time
 * backup codes. `start`/`confirm` are context-specific (profile vs invite vs setup); this component only
 * drives the UI.
 */
export function TotpEnroll({
  start,
  confirm,
  onDone,
  finalCta = "Done",
  autoStart = false,
}: {
  start: () => Promise<StartResult>;
  confirm: (code: string) => Promise<{ backupCodes: string[] }>;
  onDone: () => void;
  finalCta?: string;
  autoStart?: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "qr" | "done">(autoStart ? "qr" : "idle");
  const [data, setData] = useState<StartResult | null>(null);
  const [code, setCode] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const begin = async () => {
    setBusy(true);
    setErr(null);
    try {
      setData(await start());
      setPhase("qr");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not start setup.");
      setPhase("idle");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (autoStart && !data) void begin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verify = async () => {
    setBusy(true);
    setErr(null);
    try {
      const { backupCodes } = await confirm(code);
      setCodes(backupCodes);
      setPhase("done");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "That code didn't match.");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "idle") {
    return (
      <div className="grid gap-3">
        {err && <p className="text-sm text-destructive">{err}</p>}
        <Button onClick={begin} disabled={busy}>{busy ? "Starting…" : "Enable two-factor"}</Button>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="grid gap-3">
        <p className="text-sm font-medium">Save your backup codes</p>
        <p className="text-xs text-muted-foreground">
          Each code works once if you lose your authenticator. Store them somewhere safe — they won’t be shown again.
        </p>
        <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3 font-mono text-sm">
          {codes.map((c) => <span key={c}>{c}</span>)}
        </div>
        <Button onClick={onDone}>{finalCta}</Button>
      </div>
    );
  }

  // phase === "qr"
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Scan this in Google Authenticator / Authy, then enter the 6-digit code it shows.
      </p>
      {data?.qrDataUrl && (
        <Image src={data.qrDataUrl} alt="Authenticator QR code" width={180} height={180} className="rounded-md border bg-white p-2" unoptimized />
      )}
      {data?.secret && (
        <p className="text-xs text-muted-foreground">
          Can’t scan? Enter this key manually: <span className="font-mono break-all">{data.secret}</span>
        </p>
      )}
      <Field label="6-digit code">
        <Input
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={6}
          value={code}
          onChange={(e) => { setCode(digitsCapped(6)(e.target.value)); setErr(null); }}
        />
      </Field>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button onClick={verify} disabled={busy || code.length !== 6}>{busy ? "Verifying…" : "Verify & enable"}</Button>
    </div>
  );
}
