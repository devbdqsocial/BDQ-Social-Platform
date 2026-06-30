import { describe, it, expect } from "vitest";
import { assertWhatsAppSent, pickProvider } from "./whatsapp";

describe("pickProvider", () => {
  it("returns null when nothing is configured", () => {
    expect(pickProvider({ cloud: false, interakt: false, openwa: false })).toBe(null);
  });

  it("auto-detects, preferring cloud", () => {
    expect(pickProvider({ cloud: true, interakt: false, openwa: true })).toBe("cloud");
    expect(pickProvider({ cloud: false, interakt: true, openwa: true })).toBe("interakt");
    expect(pickProvider({ cloud: false, interakt: false, openwa: true })).toBe("openwa");
    expect(pickProvider({ cloud: true, interakt: true, openwa: true })).toBe("cloud");
  });

  it("honours an explicit provider when it's configured", () => {
    expect(pickProvider({ explicit: "interakt", cloud: true, interakt: true, openwa: true })).toBe("interakt");
    expect(pickProvider({ explicit: "cloud", cloud: true, interakt: true, openwa: true })).toBe("cloud");
    expect(pickProvider({ explicit: "openwa", cloud: true, interakt: true, openwa: true })).toBe("openwa");
  });

  it("returns null when the explicit provider isn't configured", () => {
    expect(pickProvider({ explicit: "cloud", cloud: false, interakt: true, openwa: true })).toBe(null);
    expect(pickProvider({ explicit: "interakt", cloud: true, interakt: false, openwa: true })).toBe(null);
    expect(pickProvider({ explicit: "openwa", cloud: true, interakt: true, openwa: false })).toBe(null);
  });
});

describe("assertWhatsAppSent", () => {
  it("throws when a dormant provider skips the send", () => {
    expect(() => assertWhatsAppSent({ skipped: true })).toThrow("WhatsApp provider is not configured.");
  });

  it("accepts a provider message id", () => {
    expect(() => assertWhatsAppSent({ id: "wamid.1" })).not.toThrow();
  });
});
