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
