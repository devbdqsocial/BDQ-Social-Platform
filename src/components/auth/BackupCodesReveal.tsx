"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export function BackupCodesReveal({
  codes,
  finalCta = "Done",
  onDone,
}: {
  codes: string[];
  finalCta?: string;
  onDone: () => void | Promise<void>;
}) {
  const [exported, setExported] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const text = useMemo(() => `BDQ Social backup codes\n\n${codes.join("\n")}\n`, [codes]);

  const copy = async () => {
    setErr(null);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setExported(true);
    } catch {
      setErr("Copy failed. Download the codes instead.");
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "bdq-social-backup-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
  };

  const finish = async () => {
    setBusy(true);
    setErr(null);
    try {
      await onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not continue.");
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium">Save your backup codes</p>
      <p className="text-xs text-muted-foreground">
        Each code works once if you lose your authenticator. Copy or download them, then confirm you saved them.
      </p>
      <div className="grid grid-cols-2 gap-2 rounded-md border bg-muted/40 p-3 font-mono text-sm">
        {codes.map((c) => <span key={c}>{c}</span>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={copy}>{copied ? "Copied" : "Copy codes"}</Button>
        <Button type="button" variant="outline" onClick={download}>Download .txt</Button>
      </div>
      <Label className="items-start gap-3 rounded-md border p-3 text-xs leading-relaxed">
        <Checkbox checked={saved} onCheckedChange={(v) => setSaved(v === true)} />
        <span>I saved these backup codes in a safe place. I understand they will not be shown again.</span>
      </Label>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button onClick={finish} disabled={busy || !exported || !saved}>
        {busy ? "Continuing..." : finalCta}
      </Button>
    </div>
  );
}
