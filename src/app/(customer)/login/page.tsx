import type { Metadata } from "next";
import { PhoneLogin } from "@/components/auth/PhoneLogin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in" };

export default function CustomerLoginPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:py-24">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome in</CardTitle>
          <CardDescription>Sign in with your phone number to book tickets and find them again later.</CardDescription>
        </CardHeader>
        <CardContent>
          <PhoneLogin redirectTo="/dashboard" />
        </CardContent>
      </Card>
      <p className="mt-4 text-center text-xs text-muted-foreground">
        We&apos;ll text you a one-time code. No passwords to remember.
      </p>
    </main>
  );
}
