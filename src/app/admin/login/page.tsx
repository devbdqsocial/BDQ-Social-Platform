import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin sign in" };

export default function AdminLoginPage() {
  return (
    <div className="dark bg-hero text-foreground">
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-16">
        <div className="mb-6 flex items-center justify-center gap-2 font-display text-xl font-semibold text-[#EDE6DA]">
          <ShieldCheck className="size-5 text-primary" /> Event Portal · Admin
        </div>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>Staff access only. Bring your password and 2-factor code.</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminLoginForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
