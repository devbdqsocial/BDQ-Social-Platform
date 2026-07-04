import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { readResetToken } from "@/server/auth/invite";
import { db } from "@/server/db";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ResetPassword } from "./ResetPassword";

export const metadata: Metadata = { title: "Reset password" };

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

export default async function ResetPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const data = await readResetToken(token);
  const user = data?.email
    ? await db.user.findUnique({ where: { email: data.email }, select: { role: true } })
    : null;

  if (!data || !user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    return (
      <Shell title="Link expired" description="This reset link is invalid or has expired.">
        <Button asChild className="w-full"><Link href="/admin/login">Go to sign in</Link></Button>
      </Shell>
    );
  }

  return (
    <Shell title="Reset your password" description="Choose a new password to keep using the admin portal.">
      <ResetPassword token={token} />
    </Shell>
  );
}
