import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "./razorpay-signature";

const SECRET = "whsec_test";
const body = JSON.stringify({ event: "payment.captured", id: "x" });
const sign = (b: string, s: string) => createHmac("sha256", s).update(b).digest("hex");

describe("verifyWebhookSignature", () => {
  it("accepts a correct signature", () => {
    expect(verifyWebhookSignature(body, sign(body, SECRET), SECRET)).toBe(true);
  });
  it("rejects a tampered body / wrong secret / empty", () => {
    expect(verifyWebhookSignature(body + "x", sign(body, SECRET), SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, sign(body, "other"), SECRET)).toBe(false);
    expect(verifyWebhookSignature(body, "", SECRET)).toBe(false);
  });
});
