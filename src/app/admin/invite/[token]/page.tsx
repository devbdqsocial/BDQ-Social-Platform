import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { readInviteToken } from "@/server/auth/invite";
import { db } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AcceptInvite } from "./AcceptInvite";

export const metadata: Metadata = { title: "Accept invite" };

function Shell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="admin dark min-h-dvh bg-background text-foreground">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-16">
        <div className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-semibold text-[#EDE6DA]">
          <ShieldCheck className="size-5 text-primary" /> BDQ Social · Admin
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </main>
    </div>
  );
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await readInviteToken(token);
  const user = data?.email
    ? await db.user.findUnique({ where: { email: data.email }, select: { passwordHash: true, totpEnabled: true } })
    : null;

  if (!data || !user) {
    return (
      <Shell title="Invite invalid" description="This link is invalid or has expired.">
        <Button asChild className="w-full"><Link href="/admin/login">Go to sign in</Link></Button>
      </Shell>
    );
  }

  if (user.passwordHash && user.totpEnabled) {
    return (
      <Shell title="Already set up" description="This invite has already been used.">
        <Button asChild className="w-full"><Link href="/admin/login">Sign in</Link></Button>
      </Shell>
    );
  }

  return (
    <Shell title="Welcome aboard" description="Set your password and enable two-factor to finish.">
      <AcceptInvite token={token} needsPassword={!user.passwordHash} />
    </Shell>
  );
}
