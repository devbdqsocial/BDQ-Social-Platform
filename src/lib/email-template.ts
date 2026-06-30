/** Pure email builders. Inline styles only so output works in common email clients. */

export interface EmailTicketRow {
  type: string;
  ref: string;
  qrCid?: string;
}

export interface EmailKeyValueRow {
  label: string;
  value: string;
  emphasis?: boolean;
}

const brand = {
  navy: "#01065B",
  lavender: "#868EFF",
  green: "#92FF73",
  yellow: "#D0F95F",
  pink: "#FF58AC",
  red: "#FF514D",
  cream: "#F7F3EA",
  ink: "#13172F",
  muted: "#626682",
  border: "#DDD8F0",
  white: "#FFFFFF",
};

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => htmlEscapes[char]);
}

function emailPreheader(text: string): string {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(text)}</div>`;
}

export function emailButton(label: string, url: string): string {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:${brand.navy};color:${brand.white};font-size:14px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;text-decoration:none;border-radius:999px;padding:13px 22px">${escapeHtml(label)}</a>`;
}

export function emailPanel(html: string, accent = brand.lavender): string {
  return `<div style="background:${brand.white};border:1px solid ${brand.border};border-left:6px solid ${accent};border-radius:16px;padding:18px;margin:20px 0">${html}</div>`;
}

export function emailKeyValueTable(rows: EmailKeyValueRow[]): string {
  return `<table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;line-height:1.45">${rows
    .map(
      (row) =>
        `<tr><td style="padding:10px 0;border-top:1px solid ${brand.border};color:${brand.muted}">${escapeHtml(row.label)}</td>` +
        `<td style="padding:10px 0;border-top:1px solid ${brand.border};color:${brand.ink};font-weight:${row.emphasis ? "800" : "700"};text-align:right">${escapeHtml(row.value)}</td></tr>`,
    )
    .join("")}</table>`;
}

function emailLayout(o: {
  preheader: string;
  eyebrow: string;
  title: string;
  intro?: string;
  body: string;
  footer?: "transactional" | "marketing";
  unsubscribeUrl?: string;
}): string {
  const footer =
    o.footer === "marketing"
      ? `<p style="margin:0 0 6px">BDQ Social, Main Exhibition Grounds, Vadodara, Gujarat, India</p>
         <p style="margin:0">You are receiving this because you engaged with BDQ Social. <a href="${escapeHtml(o.unsubscribeUrl ?? "#")}" style="color:${brand.navy};text-decoration:underline">Unsubscribe</a>.</p>`
      : `<p style="margin:0 0 6px">BDQ Social</p>
         <p style="margin:0">This email was sent because of your BDQ Social account, booking, or team access.</p>`;

  return `<!doctype html>
<html lang="en">
<body style="margin:0;background:${brand.cream};font-family:Inter,Arial,sans-serif;color:${brand.ink}">
  ${emailPreheader(o.preheader)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${brand.cream};border-collapse:collapse">
    <tr><td align="center" style="padding:28px 14px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;border-collapse:collapse">
        <tr><td style="background:${brand.navy};border-radius:22px 22px 0 0;padding:0;overflow:hidden">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
            <tr>
              <td style="height:8px;background:${brand.lavender};font-size:0;line-height:0">&nbsp;</td>
              <td style="height:8px;background:${brand.green};font-size:0;line-height:0">&nbsp;</td>
              <td style="height:8px;background:${brand.yellow};font-size:0;line-height:0">&nbsp;</td>
              <td style="height:8px;background:${brand.pink};font-size:0;line-height:0">&nbsp;</td>
              <td style="height:8px;background:${brand.red};font-size:0;line-height:0">&nbsp;</td>
            </tr>
          </table>
          <div style="padding:26px 28px 30px;color:${brand.white}">
            <div style="font-size:15px;font-weight:900;letter-spacing:.08em;text-transform:uppercase">BDQ Social</div>
            <div style="margin-top:24px;color:${brand.green};font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase">${escapeHtml(o.eyebrow)}</div>
            <h1 style="margin:8px 0 0;font-size:32px;line-height:1.05;font-weight:900">${escapeHtml(o.title)}</h1>
            ${o.intro ? `<p style="margin:12px 0 0;color:#EEF0FF;font-size:16px;line-height:1.55">${escapeHtml(o.intro)}</p>` : ""}
          </div>
        </td></tr>
        <tr><td style="background:${brand.white};border:1px solid ${brand.border};border-top:none;border-radius:0 0 22px 22px;padding:28px;font-size:15px;line-height:1.65">
          ${o.body}
        </td></tr>
        <tr><td style="padding:18px 26px 0;color:${brand.muted};font-size:12px;line-height:1.6;text-align:center">
          ${footer}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function ticketEmailSubject(eventName: string): string {
  return `Your tickets for ${eventName}`;
}

export function ticketEmailHtml(o: {
  eventName: string;
  when: string;
  location?: string | null;
  tickets: EmailTicketRow[];
  ticketsUrl?: string;
}): string {
  const rows = emailKeyValueTable(o.tickets.map((t) => ({ label: t.type, value: `#${t.ref}` })));
  const location = o.location ? ` at ${o.location}` : "";
  const qrCards = o.tickets
    .filter((ticket) => ticket.qrCid)
    .map(
      (ticket) => `<tr><td align="center" style="padding:10px">
        <div style="display:inline-block;background:${brand.white};border:2px solid ${brand.lavender};border-radius:18px;padding:12px">
          <img src="cid:${escapeHtml(ticket.qrCid)}" width="180" height="180" alt="QR ticket ${escapeHtml(ticket.ref)}" style="display:block;width:180px;height:180px;border:0;background:${brand.white}">
          <p style="margin:10px 0 0;color:${brand.navy};font-size:11px;font-weight:900;letter-spacing:.12em;text-transform:uppercase">Scan at entry</p>
          <p style="margin:2px 0 0;color:${brand.muted};font-size:12px;font-weight:700">${escapeHtml(ticket.type)} #${escapeHtml(ticket.ref)}</p>
        </div>
      </td></tr>`,
    )
    .join("");
  const qrBlock = qrCards ? emailPanel(`<table role="presentation" width="100%" style="border-collapse:collapse">${qrCards}</table>`, brand.lavender) : "";
  const qrCopy = `Your QR ticket${o.tickets.length === 1 ? " is" : "s are"} shown below. Keep ${o.tickets.length === 1 ? "it" : "them"} ready at entry.`;

  return emailLayout({
    preheader: `Your BDQ Social tickets for ${o.eventName}`,
    eyebrow: "Tickets confirmed",
    title: "You are in",
    intro: `${o.eventName} - ${o.when}${location}`,
    body: `${emailPanel(rows, brand.green)}
      ${qrBlock}
      <p style="margin:0 0 18px;color:${brand.muted}">${escapeHtml(qrCopy)}</p>
      ${emailButton("View my tickets", o.ticketsUrl ?? "https://bdqsocial.com/tickets")}`,
  });
}

export function reminderEmailHtml(o: { eventName: string; when: string; location?: string | null; ticketsUrl: string }): string {
  return emailLayout({
    preheader: `${o.eventName} is almost here`,
    eyebrow: "Event reminder",
    title: "See you soon",
    intro: `${o.eventName} - ${o.when}${o.location ? ` at ${o.location}` : ""}`,
    body: `${emailPanel(`<p style="margin:0;color:${brand.ink};font-weight:800">Have your QR ticket ready at the gate.</p>
      <p style="margin:8px 0 0;color:${brand.muted}">A charged phone, the ticket QR, and your crew are all you need.</p>`, brand.lavender)}
      ${emailButton("View my tickets", o.ticketsUrl)}`,
  });
}

export function waitlistEmailHtml(o: { eventName: string; url: string }): string {
  return emailLayout({
    preheader: `Tickets are available for ${o.eventName}`,
    eyebrow: "Waitlist update",
    title: "A spot opened up",
    intro: o.eventName,
    body: `<p style="margin:0 0 18px;color:${brand.muted}">Good news: tickets are available again. Book when you are ready.</p>
      ${emailButton("Get tickets", o.url)}`,
  });
}

export function staffInviteEmailHtml(o: { url: string; role: string }): string {
  return emailLayout({
    preheader: "You have been invited to the BDQ Social admin portal",
    eyebrow: "Team invite",
    title: "Set up your access",
    intro: `You have been invited as ${o.role}.`,
    body: `${emailPanel(`<p style="margin:0;color:${brand.ink};font-weight:800">Set your password and enable two-factor authentication in one step.</p>
      <p style="margin:8px 0 0;color:${brand.muted}">This invite link expires in 72 hours.</p>`, brand.yellow)}
      ${emailButton("Accept invite", o.url)}
      <p style="margin:18px 0 0;color:${brand.muted};font-size:13px;word-break:break-all">${escapeHtml(o.url)}</p>`,
  });
}

export function financeDigestEmailHtml(o: { eventName: string; rows: EmailKeyValueRow[] }): string {
  return emailLayout({
    preheader: `Finance digest for ${o.eventName}`,
    eyebrow: "Admin digest",
    title: "P&L snapshot",
    intro: o.eventName,
    body: `${emailPanel(emailKeyValueTable(o.rows), brand.lavender)}
      <p style="margin:0;color:${brand.muted};font-size:13px">Revenue is net of Razorpay fees. Open the console for the full breakdown.</p>`,
  });
}

export function verifyEmailHtml(): string {
  return emailLayout({
    preheader: "BDQ Social email integration test",
    eyebrow: "Integration test",
    title: "Email is working",
    intro: "SendGrid can send using the configured BDQ Social sender.",
    body: emailPanel(`<p style="margin:0;color:${brand.ink};font-weight:800">Delivery path verified.</p>`, brand.green),
  });
}

/**
 * Branded wrapper for a marketing campaign body (admin-authored HTML). Includes the CAN-SPAM footer:
 * a physical mailing address + a working unsubscribe link.
 */
export function campaignEmailHtml(o: { body: string; unsubscribeUrl: string }): string {
  return emailLayout({
    preheader: "An update from BDQ Social",
    eyebrow: "BDQ Social",
    title: "The latest",
    body: `<div style="font-size:15px;line-height:1.65;color:${brand.ink}">${o.body}</div>`,
    footer: "marketing",
    unsubscribeUrl: o.unsubscribeUrl,
  });
}
