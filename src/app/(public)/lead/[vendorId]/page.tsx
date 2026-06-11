import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLeadVendor } from "@/server/leads/service";
import { LeadForm } from "@/components/events/LeadForm";

export const metadata: Metadata = { title: "Stay in touch" };
export const dynamic = "force-dynamic";

export default async function LeadCapturePage({ params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const vendor = await getLeadVendor(vendorId);
  if (!vendor) notFound();

  return (
    <section className="paint flex min-h-[100svh] items-center py-[var(--space-5xl)]">
      <div className="wrapper max-w-[42rem]">
        <span className="f-paragraph-small f-bold t-upper opacity-70" style={{ letterSpacing: "0.18em" }}>Stay in touch</span>
        <h1 className="f-exat mt-[var(--space-sm)]" style={{ fontSize: "var(--h100)", lineHeight: 1.0 }}>
          Hear from {vendor.brandName}
        </h1>
        <p className="f-paragraph mt-[var(--space-md)] max-w-[44ch] opacity-70">
          Leave your details to hear about new drops, offers, and where to find them next.
        </p>
        <div className="mt-[var(--space-2xl)]">
          <LeadForm vendorProfileId={vendorId} />
        </div>
      </div>
    </section>
  );
}
