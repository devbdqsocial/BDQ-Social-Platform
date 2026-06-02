"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LogoutButton({ redirectTo = "/admin/login" }: { redirectTo?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const logout = async () => {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <Button variant="ghost" size="sm" onClick={logout} disabled={busy}>
      <LogOut className="size-4" /> Sign out
    </Button>
  );
}
