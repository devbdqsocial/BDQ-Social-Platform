import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { bumpCampaignStat } from "@/server/campaigns/stats";

export const runtime = "nodejs";

interface WebhookTag {
  name: string;
  value: string;
}

/** Shared-secret check (fail-closed). Provider sends `x-webhook-secret` or `Authorization: Bearer`. */
function authed(req: Request): boolean {
  const secret = process.env.CAMPAIGN_WEBHOOK_SECRET;
  if (!secret) return false;
  const header = req.headers.get("x-webhook-secret") ?? req.headers.get("authorization") ?? "";
  return header === secret || header === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  if (!authed(request)) {
    return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const body = (await request.json()) as { type: string; data?: { tags?: WebhookTag[] } };
    const eventType = body.type;
    const campaignId = (body.data?.tags ?? []).find((t) => t.name === "campaign_id")?.value;

    // delivered/failed are derived from Outbox in the processor — the webhook only tracks engagement.
    const field =
      eventType === "email.opened" || eventType === "whatsapp.read"
        ? "opened"
        : eventType === "email.clicked"
          ? "clicked"
          : null;

    if (campaignId && field) {
      const exists = await db.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
      if (exists) await bumpCampaignStat(campaignId, field);
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    console.error("Webhook Error: campaigns", e);
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : "Webhook failed" }, { status: 400 });
  }
}
