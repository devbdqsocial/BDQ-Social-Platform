import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  webhookCreate: vi.fn(),
  orderFindUnique: vi.fn(),
  addOnFindUnique: vi.fn(),
  fulfillOrder: vi.fn(),
  fulfillStallBooking: vi.fn(),
  fulfillAddOnOrder: vi.fn(),
  recordHeartbeat: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/lib/env", () => ({ env: { RAZORPAY_WEBHOOK_SECRET: "whsec_test" } }));
vi.mock("@/server/db", () => ({
  db: {
    webhookEvent: { create: mocks.webhookCreate },
    order: { findUnique: mocks.orderFindUnique },
    bookingAddOnOrder: { findUnique: mocks.addOnFindUnique },
  },
}));
vi.mock("@/server/tickets/service", () => ({ fulfillOrder: mocks.fulfillOrder }));
vi.mock("@/server/bookings/payment", () => ({ fulfillStallBooking: mocks.fulfillStallBooking }));
vi.mock("@/server/addons/service", () => ({ fulfillAddOnOrder: mocks.fulfillAddOnOrder }));
vi.mock("@/server/system/heartbeat", () => ({ HEARTBEAT: { webhook: "heartbeat:webhook" }, recordHeartbeat: mocks.recordHeartbeat }));
vi.mock("@/lib/logger", () => ({ logError: mocks.logError }));

import { POST } from "./route";

const raw = JSON.stringify({
  event: "payment.captured",
  payload: { payment: { entity: { id: "pay_1", order_id: "order_1", amount: 10000, fee: 200, tax: 36 } } },
});
const signature = createHmac("sha256", "whsec_test").update(raw).digest("hex");
const request = (eventId = "evt_1") =>
  new Request("https://bdq.test/api/payments/razorpay/webhook", {
    method: "POST",
    body: raw,
    headers: { "x-razorpay-signature": signature, "x-razorpay-event-id": eventId },
  });

beforeEach(() => vi.clearAllMocks());

describe("Razorpay webhook route", () => {
  it("records the event id and fulfils the matching ticket order", async () => {
    mocks.webhookCreate.mockResolvedValue({});
    mocks.orderFindUnique.mockResolvedValue({ id: "order_db_1" });

    const res = await POST(request());

    expect(res.status).toBe(200);
    expect(mocks.webhookCreate).toHaveBeenCalledWith({
      data: { provider: "RAZORPAY", eventId: "evt_1", eventType: "payment.captured" },
    });
    expect(mocks.fulfillOrder).toHaveBeenCalledWith("order_1", "pay_1", { feePaise: 200, taxPaise: 36 }, 10000);
  });

  it("short-circuits duplicate event ids before fulfilment", async () => {
    mocks.webhookCreate.mockRejectedValue({ code: "P2002" });

    const res = await POST(request("evt_dup"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ ok: true, duplicate: true });
    expect(mocks.fulfillOrder).not.toHaveBeenCalled();
    expect(mocks.fulfillStallBooking).not.toHaveBeenCalled();
    expect(mocks.fulfillAddOnOrder).not.toHaveBeenCalled();
  });
});
