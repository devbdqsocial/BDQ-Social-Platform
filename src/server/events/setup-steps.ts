import type { EventReadinessIssue } from "@/server/events/service";

/** One row of the event setup checklist. `group` drives the panel sections; `skipped` marks the
 * venue step when vendor stalls are off (rendered muted, counts as done). */
export interface SetupStep {
  key: string;
  label: string;
  group: "required" | "optional" | "platform";
  done: boolean;
  skipped?: boolean;
  href?: string;
}

export interface SetupStepsInput {
  eventId: string;
  vendorStallsEnabled: boolean;
  issues: EventReadinessIssue[];
  counts: { days: number; scheduleItems: number; lineup: number; addOns: number };
  hasPricingRules: boolean;
  hasTheme: boolean;
  hasLogistics: boolean;
}

/** Pure derivation of the full setup journey (required, optional, platform) from readiness issues
 * plus content counts. Single source of "what's left" — the Overview panel and the header progress
 * pill both render this. */
export function deriveSetupSteps(input: SetupStepsInput): SetupStep[] {
  const has = (key: string) => input.issues.some((i) => i.key === key);
  const vendorOff = !input.vendorStallsEnabled;

  return [
    { key: "details", label: "Name, description & location", group: "required", done: !has("details") && !has("dates"), href: "?tab=details" },
    { key: "days", label: "Event days & hours", group: "optional", done: input.counts.days > 0 || input.counts.scheduleItems > 0, href: "?tab=schedule" },
    { key: "tickets", label: "At least one paid ticket type", group: "required", done: !has("tickets"), href: "?tab=tickets" },
    { key: "pricing", label: "Discount rules (early-bird / bulk)", group: "optional", done: input.hasPricingRules, href: "?tab=tickets" },
    vendorOff
      ? { key: "venue", label: "Vendor stalls — off (map & stall checks skipped)", group: "required" as const, done: true, skipped: true, href: "?tab=stalls" }
      : { key: "venue", label: "Venue map with priced stalls", group: "required" as const, done: !has("venue"), href: "?tab=stalls" },
    { key: "lineup", label: "Artist lineup", group: "optional", done: input.counts.lineup > 0, href: "?tab=lineup" },
    ...(vendorOff ? [] : [{ key: "addons", label: "Stall add-ons", group: "optional" as const, done: input.counts.addOns > 0, href: `/admin/events/${input.eventId}/add-ons` }]),
    { key: "theme", label: "Public page theme", group: "optional", done: input.hasTheme, href: "?tab=settings" },
    ...(vendorOff ? [] : [{ key: "logistics", label: "Load-in & add-on window", group: "optional" as const, done: input.hasLogistics, href: "?tab=settings" }]),
    { key: "platform", label: "Legal & payment config (platform-wide)", group: "platform", done: !has("legal") && !has("payments") },
  ];
}
