"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TotpEnroll } from "@/components/auth/TotpEnroll";
import { BackupCodesReveal } from "@/components/auth/BackupCodesReveal";
import { startTotpEnrollment, confirmTotpEnrollment, regenerateBackupCodes, disableTotp } from "./security-actions";

/** Profile Security panel: self-service authenticator enrolment / reset, backup codes, and (STAFF) disable. */
export function SecurityPanel({ totpEnabled, role }: { totpEnabled: boolean; role: string }) {
  const router = useRouter();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  const finishEnroll = () => {
    setEnrollOpen(false);
    toast.success("Two-factor authentication is on.");
    router.refresh();
  };

  const regen = async () => {
    setBusy(true);
    try {
      const { backupCodes } = await regenerateBackupCodes();
      setCodes(backupCodes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not regenerate codes.");
    } finally {
      setBusy(false);
    }
  };

  const turnOff = async () => {
    setBusy(true);
    try {
      await disableTotp();
      toast.success("Two-factor disabled.");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not disable.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2">
      <p className="font-medium text-sm">Two-Factor Authentication</p>
      <p className="text-muted-foreground text-xs">
        {totpEnabled ? "Enabled — authenticator app." : "Disabled. Strongly recommended for admin accounts."}
      </p>

      <div className="flex flex-wrap gap-2 mt-1">
        <Button size="sm" variant={totpEnabled ? "outline" : "default"} className="text-xs h-8" onClick={() => setEnrollOpen(true)}>
          {totpEnabled ? "Reset authenticator" : "Enable two-factor"}
        </Button>
        {totpEnabled && (
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={regen} disabled={busy}>
            Regenerate backup codes
          </Button>
        )}
        {totpEnabled && role === "STAFF" && (
          <Button size="sm" variant="ghost" className="text-xs h-8 text-destructive" onClick={turnOff} disabled={busy}>
            Disable
          </Button>
        )}
      </div>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{totpEnabled ? "Reset authenticator" : "Enable two-factor"}</DialogTitle>
            <DialogDescription>Scan the QR with your authenticator app and confirm a code.</DialogDescription>
          </DialogHeader>
          {enrollOpen && (
            <TotpEnroll start={startTotpEnrollment} confirm={confirmTotpEnrollment} onDone={finishEnroll} />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!codes} onOpenChange={(o) => !o && setCodes(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your new backup codes</DialogTitle>
            <DialogDescription>Each works once. Save them — they won’t be shown again.</DialogDescription>
          </DialogHeader>
          {codes && <BackupCodesReveal codes={codes} onDone={() => setCodes(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
