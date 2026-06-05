import type { MetadataRoute } from "next";
import { listPublished } from "@/server/events/service";
import { listApprovedVendors } from "@/server/vendors/service";

// Generated on-demand (not prerendered at build) so a cold Neon DB can't break the build,
// and revalidated hourly. The DB reads are guarded so a runtime DB blip falls back to static URLs.
export const dynamic = "force-dynamic";
export const revalidate = 3600;

const domain = process.env.APP_BASE_DOMAIN;
const base = domain && !domain.includes("localhost") ? `https://${domain}` : "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticUrls: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, priority: 1 },
    { url: `${base}/events`, lastModified: now, priority: 0.9 },
    { url: `${base}/vendors`, lastModified: now, priority: 0.7 },
    { url: `${base}/map`, lastModified: now, priority: 0.5 },
    ...["/about", "/contact", "/privacy", "/terms", "/refunds", "/shipping", "/vendor-terms"].map(
      (p) => ({ url: `${base}${p}`, lastModified: now, priority: 0.3 }),
    ),
  ];

  try {
    const [events, vendors] = await Promise.all([listPublished(), listApprovedVendors()]);
    return [
      ...staticUrls,
      ...events.map((e) => ({ url: `${base}/events/${e.slug}`, lastModified: e.updatedAt ?? now, priority: 0.9 })),
      ...vendors.map((v) => ({ url: `${base}/vendors/${v.id}`, lastModified: now, priority: 0.6 })),
    ];
  } catch {
    return staticUrls;
  }
}
