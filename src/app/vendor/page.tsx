import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { getContract } from "@/server/vendors/contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUS: Record<string, { label: string; copy: string; variant: "primary" | "warning" | "success" | "danger" }> = {
  SUBMITTED: { label: "Submitted", variant: "primary", copy: "All set — our team will give you a call to verify your details." },
  UNDER_REVIEW: { label: "Under review", variant: "warning", copy: "We're reviewing your application. Expect a verification call soon." },
  APPROVED: { label: "Approved", variant: "success", copy: "You're in! Your stall is confirmed. See you at the market." },
  REJECTED: { label: "Not approved", variant: "danger", copy: "This application wasn't approved. Reach out and we'll help." },
};

export default async function VendorDashboard() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  const logo = profile?.assets.find((a) => a.kind === "LOGO");
  const status = profile ? STATUS[profile.approvalStatus] : null;
  const contract = profile ? await getContract(profile.id) : null;
  const signed = contract?.status === "SIGNED";

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        {logo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo.url} alt="" className="size-14 rounded-xl border border-border object-cover" />
        )}
        <div>
          <h1 className="font-display text-2xl font-semibold">{profile ? profile.brandName : "Welcome aboard"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set up your brand, share a few details, then pick your spot at the market.</p>
        </div>
      </div>

      {!profile ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm">Let&apos;s start with your brand profile — it only takes a minute.</p>
            <Button asChild className="mt-4">
              <Link href="/vendor/profile">Set up my brand <ArrowRight className="size-4" /></Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Application</CardTitle>
                {status && <Badge variant={status.variant}>{status.label}</Badge>}
              </div>
              <CardDescription>{status?.copy}</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Your documents</CardTitle>
                <Badge variant={profile.kyc ? "success" : "neutral"}>{profile.kyc ? "Received" : "Pending"}</Badge>
              </div>
              <CardDescription>
                <Link href="/vendor/profile" className="text-primary hover:underline">Update brand &amp; documents →</Link>
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Contract</CardTitle>
                <Badge variant={signed ? "success" : "warning"}>{signed ? "Signed" : "Action needed"}</Badge>
              </div>
              <CardDescription>
                <Link href="/vendor/contract" className="text-primary hover:underline">
                  {signed ? "View your signed contract →" : "Read & sign to confirm your stall →"}
                </Link>
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Book your stall</CardTitle>
          <CardDescription>Browse upcoming markets and pick your spot right on the event layout.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/vendor/events">Browse markets <ArrowRight className="size-4" /></Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
