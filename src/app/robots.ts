import type { MetadataRoute } from "next";

const domain = process.env.APP_BASE_DOMAIN;
const base = domain && !domain.includes("localhost") ? `https://${domain}` : "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/vendor", "/api"] },
    sitemap: `${base}/sitemap.xml`,
  };
}
