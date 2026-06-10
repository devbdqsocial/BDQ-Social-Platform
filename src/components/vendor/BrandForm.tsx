"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveProfileAction } from "@/app/vendor/(app)/profile/actions";
import { AssetUploader } from "@/components/vendor/AssetUploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const fieldCls = "h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";
const areaCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

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
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Brand name *"><Input name="brandName" required defaultValue={brandDefault} placeholder="Your public brand" /></Field>
        <Field label="Registered / legal name"><Input name="registeredName" defaultValue={profile.registeredName ?? ""} placeholder="As on PAN / GST" /></Field>
        <Field label="Product category *">
          <select name="productCategory" required defaultValue={profile.productCategory ?? ""} className={fieldCls}>
            <option value="">Select…</option>
            {PRODUCT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Contact person"><Input name="contactPerson" defaultValue={profile.contactPerson ?? ""} /></Field>
        <Field label="WhatsApp"><Input name="whatsapp" defaultValue={profile.whatsapp ?? ""} placeholder="+91 98765 43210" /></Field>
        <Field label="City / area"><Input name="city" defaultValue={profile.city ?? ""} placeholder="Vadodara" /></Field>
        <Field label="Website"><Input name="website" defaultValue={profile.website ?? ""} placeholder="https://" /></Field>
        <Field label="Instagram"><Input name="instagram" defaultValue={profile.instagram ?? ""} placeholder="@yourhandle" /></Field>
      </div>
      <Field label="What do you sell? *">
        <textarea name="products" required rows={2} defaultValue={profile.products ?? ""} className={areaCls} placeholder="e.g. handmade silver jewellery, kurtis, candles" />
      </Field>
      <Field label="Brand description">
        <textarea name="description" rows={3} defaultValue={profile.description ?? ""} className={areaCls} placeholder="A line or two about your brand" />
      </Field>

      <div className="grid gap-6 border-t border-border pt-5 sm:grid-cols-3">
        <AssetUploader kind="LOGO" label="Logo" assets={profile.assets} />
        <AssetUploader kind="BANNER" label="Banner" assets={profile.assets} />
        <AssetUploader kind="PRODUCT" label="Product photos" assets={profile.assets} />
      </div>

      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Save & continue"}</Button>
    </form>
  );
}
