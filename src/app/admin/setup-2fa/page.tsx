import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { readSetupUserId } from "@/server/auth/session";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SetupTwoFactor } from "./SetupTwoFactor";

export const metadata: Metadata = { title: "Set up two-factor" };

/** Reached when an admin's password is right but 2FA isn't set up yet (invite / first login). */
export default async function SetupTwoFactorPage() {
  const userId = await readSetupUserId();
  if (!userId) redirect("/admin/login");

  return (
    <div className="admin dark min-h-dvh bg-background text-foreground">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-16">
        <div className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-semibold text-[#EDE6DA]">
          <ShieldCheck className="size-5 text-primary" /> Finish setting up
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Enable two-factor</CardTitle>
            <CardDescription>Admin accounts require an authenticator. Set it up to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <SetupTwoFactor />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
