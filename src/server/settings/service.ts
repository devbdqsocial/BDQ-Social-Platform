import "server-only";
import { cache } from "react";
import { z } from "zod";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

/**
 * Typed platform settings on top of the SystemSetting key-value table. Each group is one JSON-encoded
 * row (one audit entry per save). Secrets stay in env — only non-secret, admin-editable config lives here.
 */

/** Read + validate a JSON settings group; falls back (incl. on DB error) so callers never crash. */
async function readJson<T>(key: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  try {
    const row = await db.systemSetting.findUnique({ where: { key } });
    if (!row?.value) return fallback;
    const parsed = schema.safeParse(JSON.parse(row.value));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

/** Upsert a JSON settings group through the audit choke-point. */
function writeJson<T>(session: Session, key: string, data: T) {
  return withAudit(session, { action: "UPDATE_SETTING", entity: "SystemSetting", entityId: key }, async () => {
    const before = await db.systemSetting.findUnique({ where: { key } });
    return {
      before,
      run: async () => {
        const after = await db.systemSetting.upsert({
          where: { key },
          create: { key, value: JSON.stringify(data) },
          update: { value: JSON.stringify(data) },
        });
        return { result: data, after };
      },
    };
  });
}

// ──────────────────────────── ORGANIZATION ────────────────────────────
const ORG_KEY = "settings.org";

// GSTIN/PAN are stored for records/display only — there is NO GST tax flow (CLAUDE.md locked rule).
export const orgSchema = z.object({
  legalName: z.string().trim().max(160).default(""),
  address: z.string().trim().max(400).default(""),
  gstin: z.string().trim().max(20).default(""),
  pan: z.string().trim().max(15).default(""),
  supportEmail: z.string().trim().max(160).default(""),
  supportPhone: z.string().trim().max(20).default(""),
  website: z.string().trim().max(200).default(""),
});
export type OrgSettings = z.infer<typeof orgSchema>;

export const getOrgSettings = () => readJson(ORG_KEY, orgSchema, orgSchema.parse({}));
export const saveOrgSettings = (session: Session, input: unknown) => writeJson(session, ORG_KEY, orgSchema.parse(input));

// ──────────────────────────── SEO ────────────────────────────
const SEO_KEY = "settings.seo";

export const seoSchema = z.object({
  title: z.string().trim().max(120).default(""),
  description: z.string().trim().max(300).default(""),
  ogImage: z.string().trim().max(400).default(""),
});
export type SeoSettings = z.infer<typeof seoSchema>;

/** Cached per request: read by the root layout's generateMetadata on (potentially) every page. */
export const getSeoSettings = cache(() => readJson(SEO_KEY, seoSchema, seoSchema.parse({})));
export const saveSeoSettings = (session: Session, input: unknown) => writeJson(session, SEO_KEY, seoSchema.parse(input));

// ──────────────────────────── ANALYTICS ────────────────────────────
const ANALYTICS_KEY = "settings.analytics";

export const analyticsSchema = z.object({
  ga4: z.string().trim().max(40).default(""), // G-XXXXXXXXXX
  metaPixel: z.string().trim().max(40).default(""), // numeric pixel id
  clarity: z.string().trim().max(40).default(""), // clarity project id
});
export type AnalyticsSettings = z.infer<typeof analyticsSchema>;

export const getAnalyticsSettings = cache(() => readJson(ANALYTICS_KEY, analyticsSchema, analyticsSchema.parse({})));
export const saveAnalyticsSettings = (session: Session, input: unknown) => writeJson(session, ANALYTICS_KEY, analyticsSchema.parse(input));

// ──────────────────────────── FEATURE FLAGS ────────────────────────────
const FLAGS_KEY = "settings.flags";

/** Only flags that are actually wired to a consumer are exposed — no dead toggles. Default ON when unset. */
export const FEATURE_FLAGS = [
  { key: "offers", label: "Offers", description: "Vendor & sponsor deals on the customer app." },
  { key: "gallery", label: "Gallery", description: "Published event photos for customers." },
  { key: "guide", label: "Festival guide", description: "The customer-facing event guide." },
  { key: "lineup", label: "Artist lineup", description: "Public artist lineup page (/lineup)." },
] as const;
export type FeatureFlag = (typeof FEATURE_FLAGS)[number]["key"];
const FLAG_KEYS = FEATURE_FLAGS.map((f) => f.key) as readonly FeatureFlag[];

/** All flags resolved (missing key = enabled). Cached per request so customer surfaces share one read. */
export const getFlags = cache(async (): Promise<Record<FeatureFlag, boolean>> => {
  let stored: Record<string, unknown> = {};
  try {
    const row = await db.systemSetting.findUnique({ where: { key: FLAGS_KEY } });
    if (row?.value) stored = JSON.parse(row.value);
  } catch {
    stored = {};
  }
  return Object.fromEntries(FLAG_KEYS.map((k) => [k, stored[k] !== false])) as Record<FeatureFlag, boolean>;
});

export async function featureEnabled(flag: FeatureFlag): Promise<boolean> {
  return (await getFlags())[flag];
}

export function saveFlags(session: Session, input: Record<string, boolean>) {
  const data = Object.fromEntries(FLAG_KEYS.map((k) => [k, !!input[k]])) as Record<FeatureFlag, boolean>;
  return writeJson(session, FLAGS_KEY, data);
}
