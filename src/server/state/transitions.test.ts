import { describe, expect, it } from "vitest";
import {
  BOOKING_TRANSITIONS,
  ORDER_TRANSITIONS,
  STALL_TRANSITIONS,
  TICKET_TRANSITIONS,
  canTransition,
} from "./transitions";

describe("state transitions", () => {
  it("stall: legal path, no jump straight to BOOKED", () => {
    expect(canTransition(STALL_TRANSITIONS, "AVAILABLE", "HELD")).toBe(true);
    expect(canTransition(STALL_TRANSITIONS, "HELD", "PENDING")).toBe(true);
    expect(canTransition(STALL_TRANSITIONS, "PENDING", "BOOKED")).toBe(true);
    expect(canTransition(STALL_TRANSITIONS, "AVAILABLE", "BOOKED")).toBe(false);
    expect(canTransition(STALL_TRANSITIONS, "BOOKED", "PENDING")).toBe(false);
  });

  it("order: PAID is terminal (no un-pay / no refund)", () => {
    expect(canTransition(ORDER_TRANSITIONS, "PENDING", "PAID")).toBe(true);
    expect(canTransition(ORDER_TRANSITIONS, "PAID", "PENDING")).toBe(false);
    expect(canTransition(ORDER_TRANSITIONS, "PAID", "FAILED")).toBe(false);
  });

  it("ticket: single entry, CHECKED_IN is terminal", () => {
    expect(canTransition(TICKET_TRANSITIONS, "VALID", "CHECKED_IN")).toBe(true);
    expect(canTransition(TICKET_TRANSITIONS, "CHECKED_IN", "VALID")).toBe(false);
  });

  it("booking: approve from PENDING; rejected is terminal", () => {
    expect(canTransition(BOOKING_TRANSITIONS, "PENDING", "BOOKED")).toBe(true);
    expect(canTransition(BOOKING_TRANSITIONS, "REJECTED", "BOOKED")).toBe(false);
  });
});
