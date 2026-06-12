import { describe, it, expect } from "vitest";
import { pickProvider } from "./whatsapp";

describe("pickProvider", () => {
  it("returns null when nothing is configured", () => {
    expect(pickProvider({ cloud: false, interakt: false })).toBe(null);
  });

  it("auto-detects, preferring cloud", () => {
    expect(pickProvider({ cloud: true, interakt: false })).toBe("cloud");
    expect(pickProvider({ cloud: false, interakt: true })).toBe("interakt");
    expect(pickProvider({ cloud: true, interakt: true })).toBe("cloud");
  });

  it("honours an explicit provider when it's configured", () => {
    expect(pickProvider({ explicit: "interakt", cloud: true, interakt: true })).toBe("interakt");
    expect(pickProvider({ explicit: "cloud", cloud: true, interakt: true })).toBe("cloud");
  });

  it("returns null when the explicit provider isn't configured", () => {
    expect(pickProvider({ explicit: "cloud", cloud: false, interakt: true })).toBe(null);
    expect(pickProvider({ explicit: "interakt", cloud: true, interakt: false })).toBe(null);
  });
});
