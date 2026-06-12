import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminRole } from "@/server/auth/guard";
import { listCampaigns, getCampaignSettings } from "@/server/campaigns/service";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { createCampaignAction, updateSettingAction } from "./actions";
import { CampaignsTable } from "./CampaignsTable";

export const metadata: Metadata = { title: "Campaigns" };

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function CampaignsPage({ searchParams }: PageProps) {
  await requireAdminRole();
  const campaigns = await listCampaigns();
  const settings = await getCampaignSettings();
  
  const params = await searchParams;
  const activeTab = params.tab || "overview";

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Campaigns" 
        description="Directly manage WhatsApp and Email campaigns from the portal. Set up credentials to begin broadcasting." 
      />

      {/* Modern Tabs Navigation */}
      <div className="flex border-b border-muted">
        <Link 
          href="/admin/growth/campaigns?tab=overview" 
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-all duration-200 ${
            activeTab === "overview" 
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Campaigns Overview
        </Link>
        <Link 
          href="/admin/growth/campaigns?tab=settings" 
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-[2px] transition-all duration-200 ${
            activeTab === "settings" 
              ? "border-emerald-600 text-emerald-600 dark:text-emerald-400 font-semibold" 
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          API Settings Configuration
        </Link>
      </div>

      {activeTab === "overview" ? (
        <div className="space-y-8">
          {/* New Campaign Creation Panel */}
          <div className="rounded-xl border bg-card/60 backdrop-blur-md p-6 shadow-sm">
            <form action={createCampaignAction} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold tracking-tight">New Broadcast Campaign</h2>
                <p className="text-sm text-muted-foreground">Instantly opens the workspace where you can target, preview, and send.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Campaign Name" className="sm:col-span-2">
                  <Input name="name" required placeholder="e.g., Early Bird Blast / Waitlist Announcement" />
                </Field>
                <Field label="Notification Channel" className="sm:col-span-2">
                  <Select name="channel" defaultValue="EMAIL">
                    <option value="EMAIL">Email</option>
                    <option value="WHATSAPP">WhatsApp Cloud API</option>
                  </Select>
                </Field>
                <Button type="submit" className="w-fit bg-emerald-600 hover:bg-emerald-700 text-white font-medium sm:col-span-2">
                  Launch Builder Workspace
                </Button>
              </div>
            </form>
          </div>

          {/* Active campaigns list */}
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold">Campaign History ({campaigns.length})</h2>
            <CampaignsTable campaigns={campaigns} />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">System Settings & API Keys</h2>
            <p className="text-sm text-muted-foreground">Configured parameters are stored securely in the database to override env setups dynamically.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Resend Configuration Block */}
            <div className="rounded-xl border bg-card/60 backdrop-blur-md p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-base">Resend Email API</h3>
                  <p className="text-xs text-muted-foreground">Used for sending raw HTML layout broadcast emails.</p>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wide border ${
                  settings.RESEND_API_KEY ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                }`}>
                  {settings.RESEND_API_KEY ? "Active" : "Not Configured"}
                </div>
              </div>

              <form action={updateSettingAction} className="space-y-4 pt-2 border-t border-muted">
                <input type="hidden" name="key" value="RESEND_API_KEY" />
                <Field label="Resend API Key" hint="Starts with re_">
                  <Input 
                    type="password"
                    name="value" 
                    placeholder={settings.RESEND_API_KEY ? "••••••••••••••••••••••••" : "Paste new Resend key"} 
                    required 
                  />
                </Field>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Save Key
                </Button>
              </form>

              <form action={updateSettingAction} className="space-y-4 pt-4 border-t border-muted">
                <input type="hidden" name="key" value="EMAIL_FROM" />
                <Field label="Sender Email address (EMAIL_FROM)" hint="Needs to be a verified domain on Resend">
                  <Input 
                    name="value" 
                    defaultValue={settings.EMAIL_FROM} 
                    required 
                  />
                </Field>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Save Sender
                </Button>
              </form>
            </div>

            {/* WhatsApp Configuration Block */}
            <div className="rounded-xl border bg-card/60 backdrop-blur-md p-6 space-y-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-base">WhatsApp Cloud API</h3>
                  <p className="text-xs text-muted-foreground">Used for bulk broadcasts using official Graph API.</p>
                </div>
                <div className={`px-2 py-0.5 rounded-full text-2xs font-semibold uppercase tracking-wide border ${
                  settings.WHATSAPP_CLOUD_TOKEN && settings.WHATSAPP_CLOUD_PHONE_ID ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                }`}>
                  {settings.WHATSAPP_CLOUD_TOKEN && settings.WHATSAPP_CLOUD_PHONE_ID ? "Active" : "Not Configured"}
                </div>
              </div>

              <form action={updateSettingAction} className="space-y-4 pt-2 border-t border-muted">
                <input type="hidden" name="key" value="WHATSAPP_CLOUD_TOKEN" />
                <Field label="System Access Token" hint="Meta Developer Temporary or Permanent Token">
                  <Input 
                    type="password"
                    name="value" 
                    placeholder={settings.WHATSAPP_CLOUD_TOKEN ? "••••••••••••••••••••••••" : "Paste access token"} 
                    required 
                  />
                </Field>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Save Access Token
                </Button>
              </form>

              <form action={updateSettingAction} className="space-y-4 pt-4 border-t border-muted">
                <input type="hidden" name="key" value="WHATSAPP_CLOUD_PHONE_ID" />
                <Field label="Phone Number ID" hint="From WhatsApp cloud configuration tab">
                  <Input 
                    name="value" 
                    defaultValue={settings.WHATSAPP_CLOUD_PHONE_ID}
                    placeholder="e.g., 102948576..."
                    required 
                  />
                </Field>
                <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  Save Phone ID
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

