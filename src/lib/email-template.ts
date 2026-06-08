/** Pure ticket-email builders (no I/O) so they're unit-testable. Inline styles for email clients. */

export interface EmailTicketRow {
  type: string;
  ref: string;
}

export function ticketEmailSubject(eventName: string): string {
  return `Your tickets for ${eventName}`;
}

export function ticketEmailHtml(o: {
  eventName: string;
  when: string;
  location?: string | null;
  tickets: EmailTicketRow[];
}): string {
  const rows = o.tickets
    .map(
      (t) =>
        `<tr><td style="padding:10px 14px;border-top:1px solid #ECE4D6">${t.type}</td>` +
        `<td style="padding:10px 14px;border-top:1px solid #ECE4D6;color:#6F6552;text-align:right">#${t.ref}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html><body style="margin:0;background:#FBF7F0;font-family:Inter,Arial,sans-serif;color:#352F26">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#120E09;color:#EDE6DA;border-radius:14px 14px 0 0;padding:24px">
      <div style="font-size:20px;font-weight:600">BDQ <span style="color:#D69A22">Social</span></div>
    </div>
    <div style="background:#fff;border:1px solid #ECE4D6;border-top:none;border-radius:0 0 14px 14px;padding:24px">
      <h1 style="margin:0 0 4px;font-size:22px">You're in!</h1>
      <p style="margin:0;color:#6F6552">${o.eventName}</p>
      <p style="margin:2px 0 0;color:#6F6552;font-size:14px">${o.when}${o.location ? ` · ${o.location}` : ""}</p>
      <table style="width:100%;border-collapse:collapse;margin-top:20px">${rows}</table>
      <p style="margin:20px 0 0;color:#6F6552;font-size:13px">Your QR ticket${o.tickets.length > 1 ? "s are" : " is"} attached — show ${o.tickets.length > 1 ? "them" : "it"} at the gate. All sales are final.</p>
    </div>
  </div>
</body></html>`;
}

/**
 * Branded wrapper for a marketing campaign body (admin-authored HTML). Includes the CAN-SPAM footer:
 * a physical mailing address + a working unsubscribe link.
 */
export function campaignEmailHtml(o: { body: string; unsubscribeUrl: string }): string {
  return `<!doctype html>
<html><body style="margin:0;background:#FBF7F0;font-family:Inter,Arial,sans-serif;color:#352F26">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#120E09;color:#EDE6DA;border-radius:14px 14px 0 0;padding:24px">
      <div style="font-size:20px;font-weight:600">BDQ <span style="color:#D69A22">Social</span></div>
    </div>
    <div style="background:#fff;border:1px solid #ECE4D6;border-top:none;border-radius:0 0 14px 14px;padding:24px;font-size:15px;line-height:1.6">
      ${o.body}
    </div>
    <div style="padding:16px 24px;color:#9A8E78;font-size:12px;text-align:center;line-height:1.6">
      <p style="margin:0 0 6px">BDQ Social · Main Exhibition Grounds, Vadodara, Gujarat, India</p>
      <p style="margin:0">You're receiving this because you engaged with BDQ Social.
        <a href="${o.unsubscribeUrl}" style="color:#9A8E78;text-decoration:underline">Unsubscribe</a>.</p>
    </div>
  </div>
</body></html>`;
}
