import { describe, expect, it } from "vitest";
import { ticketEmailHtml, ticketEmailSubject } from "./email-template";

describe("ticket email", () => {
  it("subject names the event", () => {
    expect(ticketEmailSubject("BDQ Social")).toContain("BDQ Social");
  });

  it("html includes event + each ticket type", () => {
    const html = ticketEmailHtml({
      eventName: "BDQ Social — October",
      when: "17 Oct 2026, 4:00 pm",
      location: "Aarush Lawn",
      tickets: [
        { type: "General", ref: "abc123" },
        { type: "VIP", ref: "def456" },
      ],
    });
    expect(html).toContain("BDQ Social — October");
    expect(html).toContain("General");
    expect(html).toContain("VIP");
    expect(html).toContain("Aarush Lawn");
  });
});
