import "server-only";
import { db } from "@/server/db";

/**
 * Atomically bump a campaign delivery stat counter inside the `stats` JSONB, avoiding the
 * read-modify-write race that loses concurrent updates. `field` is whitelisted.
 *   delivered/failed — set by the outbox processor; opened/clicked — set by the provider webhook.
 */
const FIELDS = new Set(["delivered", "failed", "opened", "clicked"]);

export async function bumpCampaignStat(campaignId: string, field: string, by = 1): Promise<void> {
  if (!FIELDS.has(field)) return;
  await db.$executeRawUnsafe(
    `UPDATE "Campaign"
       SET stats = jsonb_set(COALESCE(stats, '{}'::jsonb), $1::text[], to_jsonb(COALESCE((stats->>$2)::int, 0) + $3::int))
     WHERE id = $4`,
    `{${field}}`,
    field,
    by,
    campaignId,
  );
}
