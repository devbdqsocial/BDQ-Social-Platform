import { describe, expect, it } from "vitest";
import { channelsFor } from "./notify-channels";
import { buildTicketWhatsApp } from "./whatsapp-template";

describe("channelsFor", () => {
  it("includes a channel only when on AND a contact exists", () => {
    expect(channelsFor({ email: "a@b.c", phone: "+91", emailOn: true, waOn: true })).toEqual(["EMAIL", "WHATSAPP"]);
    expect(channelsFor({ email: "a@b.c", phone: "+91", emailOn: true, waOn: false })).toEqual(["EMAIL"]);
    expect(channelsFor({ email: null, phone: "+91", emailOn: true, waOn: true })).toEqual(["WHATSAPP"]);
    expect(channelsFor({ email: "a@b.c", phone: null, emailOn: true, waOn: true })).toEqual(["EMAIL"]);
    expect(channelsFor({ email: "a@b.c", phone: "+91", emailOn: false, waOn: false })).toEqual([]);
  });
});

describe("buildTicketWhatsApp", () => {
  it("orders the template body variables", () => {
    expect(buildTicketWhatsApp({ eventName: "BDQ", ticketCount: 2, ticketsUrl: "u" })).toEqual(["BDQ", "2", "u"]);
  });
});
