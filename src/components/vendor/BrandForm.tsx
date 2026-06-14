"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveProfileAction } from "@/app/vendor/(app)/profile/actions";
import { AssetUploader } from "@/components/vendor/AssetUploader";
import { RpaField, RpaInput, RpaTextarea, RpaSelect, RpaSubmit } from "@/components/vendor/rpa-fields";
import { PRODUCT_CATEGORIES } from "@/server/schemas";

export type BrandProfile = {
  brandName: string;
  registeredName: string | null;
  productCategory: string | null;
  products: string | null;
  description: string | null;
  website: string | null;
  instagram: string | null;
  contactPerson: string | null;
  whatsapp: string | null;
  city: string | null;
  assets: { id: string; url: string; kind: string }[];
};

export function BrandForm({ profile }: { profile: BrandProfile }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const brandDefault = profile.brandName === "New vendor" ? "" : profile.brandName;

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    try {
      await saveProfileAction(new FormData(e.currentTarget));
      toast.success("Brand details saved");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-[var(--space-xl)]">
      <div className="grid gap-[var(--space-lg)] sm:grid-cols-2">
        <RpaField label="Brand name *"><RpaInput name="brandName" required defaultValue={brandDefault} placeholder="Your public brand" /></RpaField>
        <RpaField label="Registered / legal name"><RpaInput name="registeredName" defaultValue={profile.registeredName ?? ""} placeholder="As on PAN / GST" /></RpaField>
        <RpaField label="Product category *">
          <RpaSelect name="productCategory" required defaultValue={profile.productCategory ?? ""}>
            <option value="">Select…</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </RpaSelect>
        </RpaField>
        <RpaField label="Contact person"><RpaInput name="contactPerson" defaultValue={profile.contactPerson ?? ""} /></RpaField>
        <RpaField label="WhatsApp"><RpaInput name="whatsapp" defaultValue={profile.whatsapp ?? ""} placeholder="+91 98765 43210" /></RpaField>
        <RpaField label="City / area"><RpaInput name="city" defaultValue={profile.city ?? ""} placeholder="Vadodara" /></RpaField>
        <RpaField label="Website"><RpaInput name="website" defaultValue={profile.website ?? ""} placeholder="https://" /></RpaField>
        <RpaField label="Instagram"><RpaInput name="instagram" defaultValue={profile.instagram ?? ""} placeholder="@yourhandle" /></RpaField>
      </div>
      <RpaField label="What do you sell? *">
        <RpaTextarea name="products" required rows={2} defaultValue={profile.products ?? ""} placeholder="e.g. handmade silver jewellery, kurtis, candles" />
      </RpaField>
      <RpaField label="Brand description">
        <RpaTextarea name="description" rows={3} defaultValue={profile.description ?? ""} placeholder="A line or two about your brand" />
      </RpaField>

      <div className="grid gap-[var(--space-xl)] pt-[var(--space-lg)] sm:grid-cols-3" style={{ borderTop: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}>
        <AssetUploader kind="LOGO" label="Logo" assets={profile.assets} />
        <AssetUploader kind="BANNER" label="Banner" assets={profile.assets} />
        <AssetUploader kind="PRODUCT" label="Product photos" assets={profile.assets} />
      </div>

      <RpaSubmit lg disabled={busy}>{busy ? "Saving…" : "Save & continue"}</RpaSubmit>
    </form>
  );
}
