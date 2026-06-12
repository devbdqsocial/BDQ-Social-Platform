import { describe, expect, it } from "vitest";
import { rejectCrossOrigin } from "./origin";

const req = (headers: Record<string, string>) =>
  new Request("https://bdqsocial.com/api/orders", { method: "POST", headers });

describe("rejectCrossOrigin", () => {
  it("passes same-origin requests", () => {
    expect(rejectCrossOrigin(req({ origin: "https://bdqsocial.com", host: "bdqsocial.com" }))).toBeNull();
  });

  it("passes zone subdomains posting to their own host", () => {
    expect(
      rejectCrossOrigin(req({ origin: "https://vendors.bdqsocial.com", host: "vendors.bdqsocial.com" })),
    ).toBeNull();
  });

  it("prefers x-forwarded-host behind the proxy", () => {
    expect(
      rejectCrossOrigin(
        req({ origin: "https://bdqsocial.com", host: "10.0.0.1:3000", "x-forwarded-host": "bdqsocial.com" }),
      ),
    ).toBeNull();
  });

  it("passes when Origin is absent (server-to-server / native)", () => {
    expect(rejectCrossOrigin(req({ host: "bdqsocial.com" }))).toBeNull();
  });

  it("rejects a foreign origin", async () => {
    const res = rejectCrossOrigin(req({ origin: "https://evil.example", host: "bdqsocial.com" }));
    expect(res?.status).toBe(403);
  });

  it("rejects a malformed origin", () => {
    const res = rejectCrossOrigin(req({ origin: "not a url", host: "bdqsocial.com" }));
    expect(res?.status).toBe(403);
  });
});
