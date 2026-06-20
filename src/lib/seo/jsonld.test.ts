import { describe, it, expect } from "vitest";
import { organizationLd, eventLd, breadcrumbLd, faqLd, siteUrl } from "./jsonld";

describe("organizationLd", () => {
  it("omits [BRACKETED] placeholder LEGAL values, keeps real ones", () => {
    const org = organizationLd();
    // entity/email/phone ship as placeholders pre-launch → must not leak into schema.
    expect(org.legalName).toBeUndefined();
    expect(org.email).toBeUndefined();
    expect(org.telephone).toBeUndefined();
    expect(org.name).toBe("BDQ Social");
    expect((org.address as Record<string, string>).addressLocality).toBe("Vadodara");
  });
});

describe("eventLd", () => {
  const base = {
    name: "BDQ Social 2026",
    slug: "bdq-social-2026",
    description: "A curated night market.",
    location: "Vadodara",
    startsAt: new Date("2026-10-31T12:30:00.000Z"),
    endsAt: new Date("2026-10-31T18:30:00.000Z"),
  };

  it("converts paise to a major-unit INR decimal string and sets availability", () => {
    const ld = eventLd({
      ...base,
      ticketTypes: [
        { name: "GA", priceInPaise: 49900, soldQty: 10, totalQty: 100 },
        { name: "VIP", priceInPaise: 150000, soldQty: 50, totalQty: 50 },
      ],
    });
    const offers = ld.offers as Array<Record<string, string>>;
    expect(offers[0].price).toBe("499.00");
    expect(offers[0].priceCurrency).toBe("INR");
    expect(offers[0].availability).toBe("https://schema.org/InStock");
    expect(offers[1].price).toBe("1500.00");
    expect(offers[1].availability).toBe("https://schema.org/SoldOut");
  });

  it("emits ISO 8601 dates and reuses the per-event OG route for image", () => {
    const ld = eventLd({ ...base, ticketTypes: [] });
    expect(ld.startDate).toBe("2026-10-31T12:30:00.000Z");
    expect(ld.image).toEqual([`${siteUrl}/events/bdq-social-2026/opengraph-image`]);
    expect(ld.offers).toBeUndefined();
  });

  it("dedupes and drops empty performers", () => {
    const ld = eventLd({ ...base, ticketTypes: [], performers: ["DJ A", null, "DJ A", undefined, "Band B"] });
    expect(ld.performer).toEqual([
      { "@type": "PerformingGroup", name: "DJ A" },
      { "@type": "PerformingGroup", name: "Band B" },
    ]);
  });

  it("falls back to a generated description when none is given", () => {
    const ld = eventLd({ ...base, description: null, ticketTypes: [] });
    expect(ld.description as string).toContain("Vadodara");
  });
});

describe("breadcrumbLd", () => {
  it("numbers positions from 1 and makes item URLs absolute", () => {
    const ld = breadcrumbLd([{ name: "Home", path: "/" }, { name: "Events", path: "/events" }]);
    const items = ld.itemListElement as Array<Record<string, unknown>>;
    expect(items[0].position).toBe(1);
    expect(items[1].item).toBe(`${siteUrl}/events`);
  });
});

describe("faqLd", () => {
  it("maps Q&A pairs to Question/Answer entities", () => {
    const ld = faqLd([["Q?", "A."]]);
    const main = ld.mainEntity as Array<Record<string, unknown>>;
    expect(main[0]["@type"]).toBe("Question");
    expect((main[0].acceptedAnswer as Record<string, string>).text).toBe("A.");
  });
});
