import { describe, expect, it } from "vitest";
import { isReviewOverdue, REVIEW_SLA_MS } from "./vendor-sla";

/** The call-back SLA is 48h from signing (vendor-portal §3). Overdue → admin tile + softer copy. */
describe("isReviewOverdue", () => {
  const now = new Date("2026-06-15T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms);

  it("overdue past 48h", () => {
    expect(isReviewOverdue(ago(REVIEW_SLA_MS + 60_000), now)).toBe(true); // 48h + 1m
  });

  it("not overdue inside 48h", () => {
    expect(isReviewOverdue(ago(REVIEW_SLA_MS - 60_000), now)).toBe(false); // 47h59m
  });

  it("not overdue exactly at the boundary", () => {
    expect(isReviewOverdue(ago(REVIEW_SLA_MS), now)).toBe(false);
  });

  it("never overdue when not yet signed", () => {
    expect(isReviewOverdue(null, now)).toBe(false);
    expect(isReviewOverdue(undefined, now)).toBe(false);
  });
});
