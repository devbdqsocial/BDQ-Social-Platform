"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { forceLogoutAllAction } from "./actions";

export function ForceLogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!confirm("Sign out every admin and staff member (except you) from all devices?")) return;
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
    <Button variant="outline" className="w-fit text-destructive" onClick={run} disabled={busy}>
      {busy ? "Working…" : "Force log out all admins"}
    </Button>
  );
}
