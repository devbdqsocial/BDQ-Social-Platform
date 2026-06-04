import type { Metadata } from "next";
import { requireSuperAdmin } from "@/server/auth/guard";
import { listCampaigns } from "@/server/campaigns/service";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Textarea, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { createCampaignAction } from "./actions";
import { CampaignsTable } from "./CampaignsTable";

export const metadata: Metadata = { title: "Campaigns" };

export default async function CampaignsPage() {
  await requireSuperAdmin();
  const campaigns = await listCampaigns();

  return (
    <div className="space-y-6">
      <PageHeader title="Campaigns" description="Email your customers. WhatsApp blasts need an approved template (draft only for now)." />

      <form action={createCampaignAction} className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">New campaign</h2>
          <p className="text-sm text-muted-foreground">Saved as a draft — review it, then hit Send.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input name="name" required placeholder="Diwali early-bird blast" />
          </Field>
          <Field label="Channel">
            <Select name="channel" defaultValue="EMAIL">
              <option value="EMAIL">Email</option>
              <option value="WHATSAPP">WhatsApp (draft only)</option>
            </Select>
          </Field>
          <Field label="Audience">
            <Select name="audience" defaultValue="ALL">
              <option value="ALL">All customers</option>
              <option value="BUYERS">Ticket buyers</option>
            </Select>
          </Field>
          <Field label="Subject" className="sm:col-span-2">
            <Input name="subject" placeholder="Email subject line" />
          </Field>
          <Field label="Message" hint="HTML or plain text." className="sm:col-span-2">
            <Textarea name="body" rows={4} placeholder="Write your message…" />
          </Field>
          <Button type="submit" className="w-fit sm:col-span-2">Save draft</Button>
        </div>
      </form>

      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Campaigns ({campaigns.length})</h2>
        <CampaignsTable campaigns={campaigns} />
      </div>
    </div>
  );
}
