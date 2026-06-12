import { describe, it, expect } from "vitest";
import { enforcedCsp, strictCsp } from "./csp";

describe("csp", () => {
  it("enforced policy keeps inline scripts and wires reporting", () => {
    expect(enforcedCsp).toContain("script-src 'self' 'unsafe-inline'");
    expect(enforcedCsp).toContain("report-uri /api/csp-report");
    expect(enforcedCsp).toContain("frame-ancestors 'none'");
    expect(enforcedCsp).toContain("object-src 'none'");
  });

  it("strict policy carries the nonce + strict-dynamic and drops unsafe-inline reliance", () => {
    const c = strictCsp("abc123");
    expect(c).toContain("'nonce-abc123'");
    expect(c).toContain("'strict-dynamic'");
    expect(c).toContain("report-uri /api/csp-report");
  });
});
