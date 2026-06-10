"use client";
import { useState } from "react";

// Posts to the logout route, then does a FULL navigation to the public zone. `?zone=public`
// makes the middleware delete the dev `zone` cookie (otherwise `/` keeps rewriting to /vendor),
// so you land on the real public home instead of bouncing back to the vendor portal.
export function SignOutButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const [loading, setLoading] = useState(false);

  const signOut = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore network error — still leave the portal */
    }
    window.location.href = "/?zone=public";
  };

  return (
    <button type="button" onClick={signOut} disabled={loading} className={className}>
      {loading ? "Signing out…" : (children ?? "Sign out")}
    </button>
  );
}
