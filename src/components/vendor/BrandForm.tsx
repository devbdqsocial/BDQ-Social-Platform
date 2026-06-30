"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveProfileAction } from "@/app/vendor/(app)/profile/actions";
import { AssetUploader } from "@/components/vendor/AssetUploader";
import { BdqField, BdqInput, BdqTextarea, BdqSelect, BdqSubmit } from "@/components/vendor/bdq-fields";
import { PRODUCT_CATEGORIES } from "@/server/schemas";
import { phoneE164Optional, urlOptional, instagramHandle } from "@/lib/validators";
import { useFieldValidation } from "@/lib/use-field-validation";

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
  const whatsappField = useFieldValidation(phoneE164Optional);
  const websiteField = useFieldValidation(urlOptional);
  const instagramField = useFieldValidation(instagramHandle);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // whatsapp is enforced server-side too, so block on it; website/instagram stay advisory hints.
    if (!whatsappField.validate(fd.get("whatsapp"))) return;
    setBusy(true);
    try {
      await saveProfileAction(fd);
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
        <BdqField label="Brand name *"><BdqInput name="brandName" required defaultValue={brandDefault} placeholder="Your public brand" /></BdqField>
        <BdqField label="Registered / legal name"><BdqInput name="registeredName" defaultValue={profile.registeredName ?? ""} placeholder="As on PAN / GST" /></BdqField>
        <BdqField label="Product category *">
          <BdqSelect name="productCategory" required defaultValue={profile.productCategory ?? ""}>
            <option value="">Select…</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </BdqSelect>
        </BdqField>
        <BdqField label="Contact person"><BdqInput name="contactPerson" defaultValue={profile.contactPerson ?? ""} /></BdqField>
        <BdqField label="WhatsApp" error={whatsappField.error}>
          <BdqInput name="whatsapp" type="tel" inputMode="tel" maxLength={16} defaultValue={profile.whatsapp ?? ""} placeholder="9876543210"
            aria-invalid={!!whatsappField.error}
            onInput={() => whatsappField.clear()}
            onBlur={(e) => whatsappField.validate(e.currentTarget.value)} />
        </BdqField>
        <BdqField label="City / area"><BdqInput name="city" maxLength={80} defaultValue={profile.city ?? ""} placeholder="Vadodara" /></BdqField>
        <BdqField label="Website" error={websiteField.error}>
          <BdqInput name="website" type="url" maxLength={200} defaultValue={profile.website ?? ""} placeholder="https://"
            aria-invalid={!!websiteField.error}
            onInput={() => websiteField.clear()}
            onBlur={(e) => websiteField.validate(e.currentTarget.value)} />
        </BdqField>
        <BdqField label="Instagram" error={instagramField.error}>
          <BdqInput name="instagram" maxLength={30} defaultValue={profile.instagram ?? ""} placeholder="@yourhandle"
            aria-invalid={!!instagramField.error}
            onInput={() => instagramField.clear()}
            onBlur={(e) => instagramField.validate(e.currentTarget.value)} />
        </BdqField>
      </div>
      <BdqField label="What do you sell? *">
        <BdqTextarea name="products" required rows={2} defaultValue={profile.products ?? ""} placeholder="e.g. handmade silver jewellery, kurtis, candles" />
      </BdqField>
      <BdqField label="Brand description">
        <BdqTextarea name="description" rows={3} defaultValue={profile.description ?? ""} placeholder="A line or two about your brand" />
      </BdqField>

      <div className="grid gap-[var(--space-xl)] pt-[var(--space-lg)] sm:grid-cols-3" style={{ borderTop: "1px solid color-mix(in srgb, currentColor 16%, transparent)" }}>
        <AssetUploader kind="LOGO" label="Logo" assets={profile.assets} />
        <AssetUploader kind="BANNER" label="Banner" assets={profile.assets} />
        <AssetUploader kind="PRODUCT" label="Product photos" assets={profile.assets} />
      </div>

      <BdqSubmit lg disabled={busy}>{busy ? "Saving…" : "Save & continue"}</BdqSubmit>
    </form>
  );
}
