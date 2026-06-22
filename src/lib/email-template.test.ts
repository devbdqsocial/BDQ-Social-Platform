import { describe, expect, it } from "vitest";
import {
  campaignEmailHtml,
  financeDigestEmailHtml,
  reminderEmailHtml,
  staffInviteEmailHtml,
  ticketEmailHtml,
  ticketEmailSubject,
  verifyEmailHtml,
  waitlistEmailHtml,
} from "./email-template";

describe("email templates", () => {
  it("ticket email includes event, each ticket, and escapes transactional text", () => {
    const html = ticketEmailHtml({
      eventName: "BDQ Social <script>",
      when: "17 Oct 2026, 4:00 pm",
      location: "Aarush Lawn",
      tickets: [
        { type: "General", ref: "abc123", qrCid: "ticket-1@bdq" },
        { type: "VIP", ref: "def456", qrCid: "ticket-2@bdq" },
      ],
    });

    expect(ticketEmailSubject("BDQ Social")).toContain("BDQ Social");
    expect(html).toContain("BDQ Social &lt;script&gt;");
    expect(html).not.toContain("BDQ Social <script>");
    expect(html).toContain("General");
    expect(html).toContain("VIP");
    expect(html).toContain("Aarush Lawn");
    expect(html).toContain("cid:ticket-1@bdq");
    expect(html).toContain("Scan at entry");
    expect(html).toContain("View my tickets");
  });

  it("campaign email preserves admin-authored HTML and includes unsubscribe", () => {
    const html = campaignEmailHtml({ body: "<p><strong>Hello</strong> {name}</p>", unsubscribeUrl: "https://bdqsocial.com/u" });

    expect(html).toContain("<strong>Hello</strong>");
    expect(html).toContain("https://bdqsocial.com/u");
    expect(html).toContain("Unsubscribe");
  });

  it("renders reminder, waitlist, staff invite, finance digest, and verify emails", () => {
    expect(reminderEmailHtml({ eventName: "Night Market", when: "Tomorrow", location: "Vadodara", ticketsUrl: "https://bdqsocial.com/tickets" })).toContain("View my tickets");
    expect(waitlistEmailHtml({ eventName: "Night Market", url: "https://bdqsocial.com/events/night" })).toContain("Get tickets");
    expect(staffInviteEmailHtml({ url: "https://admin.bdqsocial.com/admin/invite/t", role: "ADMIN" })).toContain("Accept invite");
    expect(financeDigestEmailHtml({ eventName: "Night Market", rows: [{ label: "Net profit", value: "Rs 1,000", emphasis: true }] })).toContain("Net profit");
    expect(verifyEmailHtml()).toContain("Email is working");
  });
});
