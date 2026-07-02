import { describe, expect, it } from "vitest";
import { deriveSetupSteps, type SetupStepsInput } from "./setup-steps";

const base: SetupStepsInput = {
  eventId: "e1",
  vendorStallsEnabled: true,
  issues: [],
  counts: { days: 0, scheduleItems: 0, lineup: 0, addOns: 0 },
  hasPricingRules: false,
  hasTheme: false,
  hasLogistics: false,
};

describe("deriveSetupSteps", () => {
  it("marks required steps from readiness issue keys", () => {
    const steps = deriveSetupSteps({ ...base, issues: [{ key: "tickets", label: "", detail: "" }, { key: "venue", label: "", detail: "" }] });
    const byKey = Object.fromEntries(steps.map((s) => [s.key, s]));
    expect(byKey.details.done).toBe(true);
    expect(byKey.tickets.done).toBe(false);
    expect(byKey.venue.done).toBe(false);
    expect(byKey.platform.done).toBe(true);
  });

  it("vendor stalls off: venue is skipped-done, addons/logistics hidden", () => {
    const steps = deriveSetupSteps({ ...base, vendorStallsEnabled: false, issues: [{ key: "venue", label: "", detail: "" }] });
    const venue = steps.find((s) => s.key === "venue")!;
    expect(venue.done).toBe(true);
    expect(venue.skipped).toBe(true);
    expect(steps.some((s) => s.key === "addons")).toBe(false);
    expect(steps.some((s) => s.key === "logistics")).toBe(false);
  });

  it("vendor stalls on: full step list in order", () => {
    const steps = deriveSetupSteps(base);
    expect(steps.map((s) => s.key)).toEqual(["details", "days", "tickets", "pricing", "venue", "lineup", "addons", "theme", "logistics", "platform"]);
    expect(steps.find((s) => s.key === "addons")!.href).toBe("/admin/events/e1/add-ons");
  });

  it("optional steps track content counts", () => {
    const steps = deriveSetupSteps({ ...base, counts: { ...base.counts, days: 2, lineup: 1, addOns: 3 }, hasTheme: true });
    const byKey = Object.fromEntries(steps.map((s) => [s.key, s]));
    expect(byKey.days.done).toBe(true);
    expect(byKey.lineup.done).toBe(true);
    expect(byKey.addons.done).toBe(true);
    expect(byKey.theme.done).toBe(true);
    expect(byKey.pricing.done).toBe(false);
  });
});
