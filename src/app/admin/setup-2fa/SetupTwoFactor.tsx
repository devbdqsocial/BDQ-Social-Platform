"use client";

import { useRouter } from "next/navigation";
import { TotpEnroll } from "@/components/auth/TotpEnroll";
import { startSetup, confirmSetup, finishSetup } from "./actions";

export function SetupTwoFactor() {
  const router = useRouter();
  return (
    <TotpEnroll
      start={startSetup}
      confirm={confirmSetup}
      autoStart
      finalCta="Go to sign in"
      onDone={async () => {
        await finishSetup();
        router.replace("/admin/login");
        router.refresh();
      }}
    />
  );
}
