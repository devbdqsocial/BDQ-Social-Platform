import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLeadVendor } from "@/server/leads/service";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LeadForm } from "@/components/events/LeadForm";

export const metadata: Metadata = { title: "Stay in touch" };
export const dynamic = "force-dynamic";

export default async function LeadCapturePage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const vendor = await getLeadVendor(vendorId);
  if (!vendor) notFound();

  return (
    <main className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl">Stay in touch with {vendor.brandName}</CardTitle>
          <CardDescription>Leave your details to hear about new drops, offers, and where to find them next.</CardDescription>
        </CardHeader>
        <CardContent>
          <LeadForm vendorProfileId={vendorId} />
        </CardContent>
      </Card>
    </main>
  );
}
