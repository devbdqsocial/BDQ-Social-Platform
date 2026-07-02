"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { forceLogoutAllAction } from "./actions";

export function ForceLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      const { count } = await forceLogoutAllAction();
      toast.success(`Signed out ${count} account(s).`);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not complete.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmButton
      trigger={
        <Button variant="outline" className="w-fit text-destructive" disabled={busy}>
          {busy ? "Working…" : "Force log out all admins"}
        </Button>
      }
      title="Force log out all admins?"
      description="Signs out every admin and staff member (except you) from all devices."
      confirmLabel="Log everyone out"
      onConfirm={run}
      pending={busy}
    />
  );
}
