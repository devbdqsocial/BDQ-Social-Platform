/**
 * Schema.org JSON-LD builders. Pure functions → plain objects; rendered by <JsonLd>.
 * Money is paise everywhere in the app; schema.org `price` is a major-unit decimal string, so
 * every price here is `paise / 100`. Currency is always INR. No Review/AggregateRating is emitted
 * (no legitimate reviews exist — fabricating them violates Google's guidelines).
 */
import { LEGAL } from "@/lib/legal";

const domain = process.env.APP_BASE_DOMAIN;
/** Absolute origin for schema URLs (schema.org needs absolute URLs; relative won't validate). */
export const siteUrl =
  domain && !domain.includes("localhost") ? `https://${domain}` : "http://localhost:3000";

type Ld = Record<string, unknown>;

/** LEGAL constants ship with [BRACKETED] placeholders pre-launch — never leak them into schema. */
const real = (v?: string): string | undefined => (v && !/[[\]]/.test(v) ? v : undefined);

/** Coarse postal address — the Event model has no street/geo fields, so we assert city/region only. */
const VADODARA_ADDRESS = {
  "@type": "PostalAddress",
  addressLocality: "Vadodara",
  addressRegion: "Gujarat",
  addressCountry: "IN",
} as const;

export function organizationLd(): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: LEGAL.brand,
    legalName: real(LEGAL.entity),
    url: siteUrl,
    logo: `${siteUrl}/icon.svg`,
    email: real(LEGAL.email),
    telephone: real(LEGAL.phone),
    address: VADODARA_ADDRESS,
    areaServed: ["Vadodara", "Baroda", "Gujarat", "India"],
    description:
      "BDQ Social is Vadodara's premium curated lifestyle festival and night market — handpicked indie brands, gourmet food, and live music.",
  };
}

export function webSiteLd(): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: LEGAL.brand,
    url: siteUrl,
    inLanguage: "en-IN",
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

export interface EventLdInput {
  name: string;
  slug: string;
  description?: string | null;
  location?: string | null;
  startsAt: Date;
  endsAt: Date;
  ticketTypes: { name: string; priceInPaise: number; soldQty: number; totalQty: number }[];
  performers?: (string | null | undefined)[];
}

/** Event schema. Only rendered for PUBLISHED/LIVE events (detail page 404s otherwise) → always
 *  EventScheduled. `image` reuses the colocated per-event OG route (the model has no image field). */
export function eventLd(e: EventLdInput): Ld {
  const url = `${siteUrl}/events/${e.slug}`;
  const offers = e.ticketTypes.map((t) => ({
    "@type": "Offer",
    name: t.name,
    price: (t.priceInPaise / 100).toFixed(2),
    priceCurrency: "INR",
    availability: t.soldQty >= t.totalQty ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    url: `${url}#tickets`,
  }));
  const performers = [...new Set((e.performers ?? []).filter((p): p is string => !!p))];
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: e.name,
    startDate: e.startsAt.toISOString(),
    endDate: e.endsAt.toISOString(),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    url,
    image: [`${url}/opengraph-image`],
    description:
      e.description?.trim() ||
      `${e.name} — a curated lifestyle night market in ${e.location ?? "Vadodara"} with handpicked brands, gourmet food, and live music.`,
    location: {
      "@type": "Place",
      name: e.location ?? "Vadodara",
      address: VADODARA_ADDRESS,
    },
    organizer: { "@id": `${siteUrl}/#organization`, name: LEGAL.brand, url: siteUrl },
    ...(offers.length ? { offers } : {}),
    ...(performers.length
      ? { performer: performers.map((p) => ({ "@type": "PerformingGroup", name: p })) }
      : {}),
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${siteUrl}${it.path}`,
    })),
  };
}

export function faqLd(qas: readonly (readonly [string, string])[]): Ld {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qas.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}
