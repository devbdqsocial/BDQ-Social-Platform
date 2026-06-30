import { describe, expect, it } from "vitest";
import { normalizeOfflinePaymentDetails, OfflinePaymentError } from "./offline";

describe("normalizeOfflinePaymentDetails", () => {
  it("requires reference, note, and a positive integer amount", () => {
    expect(() => normalizeOfflinePaymentDetails({ amountPaise: 100, gatewayRef: "", note: "cash" })).toThrow(new OfflinePaymentError("REFERENCE_REQUIRED"));
    expect(() => normalizeOfflinePaymentDetails({ amountPaise: 100, gatewayRef: "UTR-1", note: "" })).toThrow(new OfflinePaymentError("NOTE_REQUIRED"));
    expect(() => normalizeOfflinePaymentDetails({ amountPaise: 0, gatewayRef: "UTR-1", note: "cash" })).toThrow(new OfflinePaymentError("INVALID_AMOUNT"));
  });

  it("normalizes trimmed details", () => {
    expect(
      normalizeOfflinePaymentDetails({ amountPaise: 50000, gatewayRef: " UTR-123 ", note: " cash at gate " }),
    ).toMatchObject({ amountPaise: 50000, gatewayRef: "UTR-123", note: "cash at gate" });
  });
});
