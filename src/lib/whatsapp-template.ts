/** Pure builder for the WhatsApp ticket template's ordered body variables. */
export function buildTicketWhatsApp(o: {
  eventName: string;
  ticketCount: number;
  ticketsUrl: string;
}): string[] {
  return [o.eventName, String(o.ticketCount), o.ticketsUrl];
}

/** Waitlist confirmation template body variables ({{1}} = link to the site). */
export function buildWaitlistWhatsApp(o: { url: string }): string[] {
  return [o.url];
}
