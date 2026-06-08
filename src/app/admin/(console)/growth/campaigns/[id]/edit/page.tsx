import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireSuperAdmin } from "@/server/auth/guard";
import { getCampaign } from "@/server/campaigns/service";
import { PageHeader } from "@/components/ui/page-header";
import { CampaignBuilder, CampaignType } from "./CampaignBuilder";

export const metadata: Metadata = { title: "Edit Campaign" };

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  const campaign = await getCampaign(id).catch(() => notFound());

  return (
    <div className="space-y-6">
      <PageHeader 
        title={`Campaign: ${campaign.name}`} 
        description={`Configure audience and content for this ${campaign.channel} campaign.`} 
      />
      <CampaignBuilder campaign={campaign as unknown as CampaignType} />
    </div>
  );
}
