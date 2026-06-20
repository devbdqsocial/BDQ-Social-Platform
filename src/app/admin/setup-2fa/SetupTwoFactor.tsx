"use client";

import { useRouter } from "next/navigation";
import { TotpEnroll } from "@/components/auth/TotpEnroll";
import { startSetup, confirmSetup } from "./actions";

export function SetupTwoFactor() {
  const router = useRouter();
  return (
    <TotpEnroll
      start={startSetup}
      confirm={confirmSetup}
      autoStart
      finalCta="Continue to dashboard"
      onDone={() => { router.push("/admin/dashboard"); router.refresh(); }}
    />
  );
}
