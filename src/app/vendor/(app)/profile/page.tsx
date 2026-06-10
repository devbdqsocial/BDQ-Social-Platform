import type { Metadata } from "next";
import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { AssetUploader } from "@/components/vendor/AssetUploader";
import { saveKycAction, saveProfileAction } from "./actions";

export const metadata: Metadata = { title: "Brand profile" };

export default async function VendorProfilePage() {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  const socials = (profile?.socials as { instagram?: string } | null) ?? null;
  const assets = (profile?.assets ?? []).map((a) => ({ id: a.id, url: a.url, kind: a.kind }));

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Your brand</h1>
        <p className="mt-1 text-sm text-muted-foreground text-pretty">
          Tell shoppers who you are. We&apos;ll give you a quick call to verify your details before your stall is confirmed.
        </p>
      </div>

      <Card asChild>
        <form action={saveProfileAction}>
          <CardHeader>
            <CardTitle>Brand details</CardTitle>
            <CardDescription>This is what visitors see in our brand directory.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Field label="Brand name">
              <Input name="brandName" required defaultValue={profile?.brandName ?? ""} />
            </Field>
            <Field label="What do you sell?" hint="A short category helps shoppers find you.">
              <Input name="category" defaultValue={profile?.category ?? ""} placeholder="Fusion wear, jewellery, food…" />
            </Field>
            <Field label="About your brand">
              <Textarea name="description" rows={3} defaultValue={profile?.description ?? ""} placeholder="A line or two about your story and what makes you special." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Website">
                <Input name="website" defaultValue={profile?.website ?? ""} placeholder="https://" />
              </Field>
              <Field label="Instagram">
                <Input name="instagram" defaultValue={socials?.instagram ?? ""} placeholder="@yourbrand" />
              </Field>
            </div>
            <Button type="submit" className="w-fit">Save brand details</Button>
          </CardContent>
        </form>
      </Card>

      <Card asChild>
        <form action={saveKycAction}>
          <CardHeader>
            <CardTitle>Verification documents</CardTitle>
            <CardDescription>For identity checks only — we don&apos;t handle GST billing.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="PAN" hint="Required">
                <Input name="pan" defaultValue={profile?.kyc?.pan ?? ""} placeholder="ABCDE1234F" />
              </Field>
              <Field label="FSSAI" hint="Food stalls">
                <Input name="fssai" defaultValue={profile?.kyc?.fssai ?? ""} />
              </Field>
              <Field label="GSTIN" hint="Optional">
                <Input name="gstin" defaultValue={profile?.kyc?.gstin ?? ""} />
              </Field>
            </div>
            <Button type="submit" variant="outline" className="w-fit">Save documents</Button>
          </CardContent>
        </form>
      </Card>

      {profile ? (
        <Card>
          <CardHeader>
            <CardTitle>Photos</CardTitle>
            <CardDescription>Add your logo and a few product shots to stand out.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <AssetUploader kind="LOGO" label="Logo" assets={assets} />
            <AssetUploader kind="PRODUCT" label="Product photos" assets={assets} />
          </CardContent>
        </Card>
      ) : (
        <p className="text-sm text-muted-foreground">Save your brand details first to add photos.</p>
      )}
    </div>
  );
}
