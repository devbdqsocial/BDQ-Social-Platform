export type NotifyChannel = "EMAIL" | "WHATSAPP";

/** Vendor lifecycle notification templates (BUSINESS-RULES §comms). */
export type VendorNotifTemplate =
  | "vendor-application"
  | "vendor-approved"
  | "vendor-rejected"
  | "vendor-booking-confirmed"
  | "vendor-event-reminder"
  | "vendor-loadin-reminder";

/** Which channels to deliver on, given the recipient's contacts + which providers are configured. */
export function channelsFor(o: {
  email?: string | null;
  phone?: string | null;
  emailOn: boolean;
  waOn: boolean;
}): NotifyChannel[] {
  const out: NotifyChannel[] = [];
  if (o.emailOn && o.email) out.push("EMAIL");
  if (o.waOn && o.phone) out.push("WHATSAPP");
  return out;
}
