import { describe, expect, it } from "vitest";
import { signTicketToken, verifyTicketToken } from "./qr-token";

const SECRET = "test-secret";

describe("ticket token", () => {
  it("signs and verifies round-trip", () => {
    const token = signTicketToken("ticket_123", SECRET);
    expect(verifyTicketToken(token, SECRET)).toEqual({ valid: true, ticketId: "ticket_123" });
  });

  it("rejects a tampered signature", () => {
    const token = signTicketToken("ticket_123", SECRET);
    const tampered = token.slice(0, -2) + (token.endsWith("aa") ? "bb" : "aa");
    expect(verifyTicketToken(tampered, SECRET).valid).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const token = signTicketToken("ticket_123", SECRET);
    expect(verifyTicketToken(token, "other-secret").valid).toBe(false);
  });

  it("rejects malformed tokens", () => {
    expect(verifyTicketToken("garbage", SECRET).valid).toBe(false);
    expect(verifyTicketToken("", SECRET).valid).toBe(false);
  });

  it("accepts a token with a future expiry", () => {
    const token = signTicketToken("t1", SECRET, Date.now() + 60_000);
    expect(verifyTicketToken(token, SECRET)).toEqual({ valid: true, ticketId: "t1" });
  });

  it("rejects an expired token", () => {
    const token = signTicketToken("t1", SECRET, Date.now() - 1000);
    expect(verifyTicketToken(token, SECRET).valid).toBe(false);
  });

  it("treats a token without an expiry as non-expiring", () => {
    const token = signTicketToken("t1", SECRET);
    expect(verifyTicketToken(token, SECRET)).toEqual({ valid: true, ticketId: "t1" });
  });
});
