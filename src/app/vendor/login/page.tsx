import type { Metadata } from "next";
import { PhoneLogin } from "@/components/auth/PhoneLogin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Vendor sign in" };

export default function VendorLoginPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col justify-center px-4 py-16 sm:py-24">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sell with us</CardTitle>
          <CardDescription>Sign in with your phone number to set up your brand and book a stall.</CardDescription>
        </CardHeader>
        <CardContent>
          <PhoneLogin redirectTo="/vendor/dashboard" zone="vendor" />
        </CardContent>
      </Card>
    </main>
  );
}
