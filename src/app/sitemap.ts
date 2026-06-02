import type { MetadataRoute } from "next";
import { listPublished } from "@/server/events/service";
import { listApprovedVendors } from "@/server/vendors/service";

const domain = process.env.APP_BASE_DOMAIN;
const base = domain && !domain.includes("localhost") ? `https://${domain}` : "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [events, vendors] = await Promise.all([listPublished(), listApprovedVendors()]);
  const now = new Date();

  return [
    { url: `${base}/`, lastModified: now, priority: 1 },
    { url: `${base}/events`, lastModified: now, priority: 0.9 },
    { url: `${base}/vendors`, lastModified: now, priority: 0.7 },
    { url: `${base}/map`, lastModified: now, priority: 0.5 },
    ...events.map((e) => ({ url: `${base}/events/${e.slug}`, lastModified: e.updatedAt ?? now, priority: 0.9 })),
    ...vendors.map((v) => ({ url: `${base}/vendors/${v.id}`, lastModified: now, priority: 0.6 })),
  ];
}
