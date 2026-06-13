import type { Metadata } from "next";
import { fmtDateLong } from "@/lib/date-formats";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { getOrCreateContract } from "@/server/vendors/contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { signContractAction } from "./actions";

export const metadata: Metadata = { title: "Contract" };

const TERMS = [
  "I will trade only the products described in my brand profile, and hold any licences required (FSSAI for food).",
  "I will set up and staff my stall for the full event hours, and keep my space clean and safe.",
  "All sales are my own responsibility; the organizers take no commission and offer no refunds on stall fees.",
  "I grant the organizers permission to feature my brand name and logo in event promotion.",
  "I will follow the venue and organiser's reasonable instructions on the day.",
];

export default async function VendorContractPage() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) {
    return <p className="text-sm text-muted-foreground">Create your brand profile first, then sign the contract.</p>;
  }
  const contract = await getOrCreateContract(profile.id);
  const signed = contract.status === "SIGNED";

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-3xl font-bold tracking-tight">Participation contract</h1>
        <Badge variant={signed ? "success" : "warning"}>{signed ? "Signed" : "Not signed"}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{profile.brandName} · stall agreement</CardTitle>
          <CardDescription>Please read and accept before your stall can be confirmed.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {TERMS.map((t) => <li key={t}>{t}</li>)}
          </ol>
        </CardContent>
      </Card>

      {signed ? (
        <p className="text-sm text-success">
          Signed{contract.signedAt ? ` on ${fmtDateLong(contract.signedAt)}` : ""}. Thank you!
        </p>
      ) : (
        <form action={signContractAction} className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="agree" className="mt-0.5 size-4" />
            I, on behalf of {profile.brandName}, have read and agree to the terms above.
          </label>
          <Button type="submit">Agree &amp; sign</Button>
        </form>
      )}
    </div>
  );
}
