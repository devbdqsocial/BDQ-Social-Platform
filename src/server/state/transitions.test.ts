import { describe, expect, it } from "vitest";
import {
  BOOKING_TRANSITIONS,
  ORDER_TRANSITIONS,
  STALL_TRANSITIONS,
  TICKET_TRANSITIONS,
  canTransition,
} from "./transitions";

describe("state transitions (booking collapse, R1.3)", () => {
  it("stall: reserve → booked path only; no jump straight to BOOKED", () => {
    expect(canTransition(STALL_TRANSITIONS, "AVAILABLE", "HELD")).toBe(true);
    expect(canTransition(STALL_TRANSITIONS, "HELD", "BOOKED")).toBe(true);
    expect(canTransition(STALL_TRANSITIONS, "HELD", "AVAILABLE")).toBe(true);
    expect(canTransition(STALL_TRANSITIONS, "AVAILABLE", "BOOKED")).toBe(false);
    expect(canTransition(STALL_TRANSITIONS, "BOOKED", "HELD")).toBe(false);
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

  it("booking: RESERVED → PENDING_PAYMENT → BOOKED; payment only after approval", () => {
    expect(canTransition(BOOKING_TRANSITIONS, "RESERVED", "PENDING_PAYMENT")).toBe(true);
    expect(canTransition(BOOKING_TRANSITIONS, "PENDING_PAYMENT", "BOOKED")).toBe(true);
    expect(canTransition(BOOKING_TRANSITIONS, "RESERVED", "BOOKED")).toBe(false); // call-back rule
    expect(canTransition(BOOKING_TRANSITIONS, "RESERVED", "REJECTED")).toBe(true);
    expect(canTransition(BOOKING_TRANSITIONS, "PENDING_PAYMENT", "CANCELLED")).toBe(true); // payBy lapse
  });

  it("booking: terminal states stay terminal", () => {
    expect(canTransition(BOOKING_TRANSITIONS, "REJECTED", "BOOKED")).toBe(false);
    expect(canTransition(BOOKING_TRANSITIONS, "CANCELLED", "RESERVED")).toBe(false);
    expect(canTransition(BOOKING_TRANSITIONS, "BOOKED", "CANCELLED")).toBe(true); // organizer cancel only
  });
});
