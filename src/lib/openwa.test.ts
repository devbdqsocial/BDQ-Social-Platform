import { describe, expect, it } from "vitest";
import { buildOpenWaImagePayload, buildOpenWaTemplatePayload, buildOpenWaTextPayload, toOpenWaChatId } from "./openwa";

describe("OpenWA payloads", () => {
  it("normalizes an E.164 phone to an OpenWA chat id", () => {
    expect(toOpenWaChatId("+91 98765 43210")).toBe("919876543210@c.us");
  });

  it("builds send-text payloads", () => {
    expect(buildOpenWaTextPayload("+919876543210", " Hello ")).toEqual({
      chatId: "919876543210@c.us",
      text: "Hello",
    });
  });

  it("builds ticket template text for OpenWA", () => {
    expect(buildOpenWaTemplatePayload({
      phone: "+919876543210",
      template: "ticket_confirmation",
      params: ["BDQ Social", "2", "https://bdqsocial.com/tickets"],
    })).toEqual({
      chatId: "919876543210@c.us",
      text: "Your BDQ Social tickets are confirmed for BDQ Social. Tickets: 2. View QR: https://bdqsocial.com/tickets",
    });
  });

  it("builds send-image payloads with base64 PNG media", () => {
    expect(buildOpenWaImagePayload({
      phone: "+919876543210",
      buffer: Buffer.from("qr"),
      filename: "ticket.png",
      caption: "Ticket QR",
    })).toEqual({
      chatId: "919876543210@c.us",
      base64: "cXI=",
      mimetype: "image/png",
      filename: "ticket.png",
      caption: "Ticket QR",
    });
  });
});
