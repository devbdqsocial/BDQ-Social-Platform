import { describe, expect, it } from "vitest";
import { createOrderSchema, ticketTypeSchema, vendorKycSchema, vendorProfileSchema } from "./schemas";

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
