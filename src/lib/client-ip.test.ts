import { describe, it, expect } from "vitest";
import { clientIp } from "./client-ip";

const reqWith = (h: Record<string, string>) => ({ headers: new Headers(h) }) as unknown as Request;

describe("clientIp", () => {
  it("uses x-real-ip and ignores a spoofed left-most x-forwarded-for", () => {
    const req = reqWith({ "x-real-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1, 9.9.9.9" });
    expect(clientIp(req)).toBe("9.9.9.9");
  });

  it("falls back to the right-most (trusted) x-forwarded-for hop, not the spoofable left-most", () => {
    expect(clientIp(reqWith({ "x-forwarded-for": "1.1.1.1, 9.9.9.9" }))).toBe("9.9.9.9");
    // attacker rotates only the left-most hop → key (trusted hop) is unchanged
    expect(clientIp(reqWith({ "x-forwarded-for": "2.2.2.2, 9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("returns 'local' when no IP headers are present", () => {
    expect(clientIp(reqWith({}))).toBe("local");
  });
});
