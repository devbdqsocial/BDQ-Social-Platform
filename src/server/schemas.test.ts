import { describe, expect, it } from "vitest";
import {
  adminCreateVendorSchema,
  couponSchema,
  createOrderSchema,
  docSectionsSchema,
  leadSchema,
  placeOrderSchema,
  ticketTypeSchema,
  vendorKycSchema,
  vendorProfileSchema,
} from "./schemas";

describe("createOrderSchema", () => {
  it("accepts a valid order", () => {
    const r = createOrderSchema.safeParse({
      eventId: "evt_1",
      items: [{ ticketTypeId: "tt_1", qty: 2 }],
      couponCode: "DIWALI",
    });
    expect(r.success).toBe(true);
  });

  it("rejects > 10 tickets per order", () => {
    const r = createOrderSchema.safeParse({
      eventId: "evt_1",
      items: [{ ticketTypeId: "tt_1", qty: 11 }],
    });
    expect(r.success).toBe(false);
  });

  it("rejects empty items and non-positive qty", () => {
    expect(createOrderSchema.safeParse({ eventId: "e", items: [] }).success).toBe(false);
    expect(
      createOrderSchema.safeParse({ eventId: "e", items: [{ ticketTypeId: "t", qty: 0 }] }).success,
    ).toBe(false);
  });

  it("accepts bounded attribution and retry keys", () => {
    const r = createOrderSchema.safeParse({
      eventId: "evt_1",
      items: [{ ticketTypeId: "tt_1", qty: 1 }],
      utm: { source: "instagram", campaign: "launch" },
      clientOrderKey: "00000000-0000-4000-8000-000000000000",
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown attribution keys", () => {
    const r = createOrderSchema.safeParse({
      eventId: "evt_1",
      items: [{ ticketTypeId: "tt_1", qty: 1 }],
      utm: { utm_source: "instagram" },
    });
    expect(r.success).toBe(false);
  });
});

describe("placeOrderSchema", () => {
  const order = { eventId: "evt_1", items: [{ ticketTypeId: "tt_1", qty: 1 }] };

  it("requires explicit terms acceptance", () => {
    expect(placeOrderSchema.safeParse(order).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...order, termsAccepted: false }).success).toBe(false);
    expect(placeOrderSchema.safeParse({ ...order, termsAccepted: true }).success).toBe(true);
  });
});

describe("docSectionsSchema", () => {
  it("accepts sections with an empty (intro) heading, rejects empty body", () => {
    expect(docSectionsSchema.safeParse([{ heading: "", body: "Intro paragraph." }]).success).toBe(true);
    expect(docSectionsSchema.safeParse([{ heading: "H", body: "" }]).success).toBe(false);
    expect(docSectionsSchema.safeParse([]).success).toBe(false);
  });
});

describe("ticketTypeSchema", () => {
  it("rejects negative or non-integer price", () => {
    expect(ticketTypeSchema.safeParse({ name: "GA", priceInPaise: -1, totalQty: 10 }).success).toBe(false);
    expect(ticketTypeSchema.safeParse({ name: "GA", priceInPaise: 1.5, totalQty: 10 }).success).toBe(false);
  });

  it("accepts a valid type and defaults attendeesPer", () => {
    const r = ticketTypeSchema.safeParse({ name: "Couple", priceInPaise: 89900, totalQty: 50 });
    expect(r.success && r.data.attendeesPer).toBe(1);
  });

  it("rejects an absurdly large price (upper bound)", () => {
    expect(ticketTypeSchema.safeParse({ name: "GA", priceInPaise: 100_000_001, totalQty: 10 }).success).toBe(false);
  });
});

describe("phone fields normalise to E.164 (10-digit Indian)", () => {
  it("adminCreateVendorSchema rejects >10 digits, normalises a valid one", () => {
    const okR = adminCreateVendorSchema.safeParse({ phone: "9876543210", brandName: "Indie" });
    expect(okR.success && okR.data.phone).toBe("+919876543210");
    expect(adminCreateVendorSchema.safeParse({ phone: "98765432109", brandName: "Indie" }).success).toBe(false);
  });

  it("vendorProfileSchema whatsapp: blank → undefined, 10-digit → E.164, bad → reject", () => {
    expect(vendorProfileSchema.safeParse({ brandName: "Indie Threads", whatsapp: "" }).success).toBe(true);
    const r = vendorProfileSchema.safeParse({ brandName: "Indie Threads", whatsapp: "9876543210" });
    expect(r.success && r.data.whatsapp).toBe("+919876543210");
    expect(vendorProfileSchema.safeParse({ brandName: "Indie Threads", whatsapp: "12345" }).success).toBe(false);
  });

  it("leadSchema requires phone or email and validates each", () => {
    expect(leadSchema.safeParse({ vendorProfileId: "v1" }).success).toBe(false);
    expect(leadSchema.safeParse({ vendorProfileId: "v1", phone: "9876543210" }).success).toBe(true);
    expect(leadSchema.safeParse({ vendorProfileId: "v1", email: "A@B.com" }).success).toBe(true);
    expect(leadSchema.safeParse({ vendorProfileId: "v1", phone: "98765432109" }).success).toBe(false);
  });
});

describe("couponSchema", () => {
  it("uppercases + bounds the code", () => {
    const r = couponSchema.safeParse({ code: "diwali10", type: "FLAT", value: 10000 });
    expect(r.success && r.data.code).toBe("DIWALI10");
    expect(couponSchema.safeParse({ code: "ab", type: "FLAT", value: 1 }).success).toBe(false);
  });
  it("PERCENT value must be 0-100", () => {
    expect(couponSchema.safeParse({ code: "HALF", type: "PERCENT", value: 50 }).success).toBe(true);
    expect(couponSchema.safeParse({ code: "OVER", type: "PERCENT", value: 101 }).success).toBe(false);
  });
});

describe("vendorKycSchema (extra format checks)", () => {
  it("GSTIN + FSSAI formats", () => {
    expect(vendorKycSchema.safeParse({ gstin: "22ABCDE1234F1Z5" }).success).toBe(true);
    expect(vendorKycSchema.safeParse({ gstin: "BADGST" }).success).toBe(false);
    expect(vendorKycSchema.safeParse({ fssai: "12345678901234" }).success).toBe(true);
    expect(vendorKycSchema.safeParse({ fssai: "123" }).success).toBe(false);
  });
});

describe("vendor schemas", () => {
  it("profile requires a brand name", () => {
    expect(vendorProfileSchema.safeParse({ brandName: "A" }).success).toBe(false);
    expect(vendorProfileSchema.safeParse({ brandName: "Indie Threads", instagram: "@x" }).success).toBe(true);
  });

  it("KYC PAN must be 10 chars when present, all fields optional", () => {
    expect(vendorKycSchema.safeParse({}).success).toBe(true);
    expect(vendorKycSchema.safeParse({ pan: "ABCDE1234F" }).success).toBe(true);
    expect(vendorKycSchema.safeParse({ pan: "SHORT" }).success).toBe(false);
  });
});
