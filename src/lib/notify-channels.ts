export type NotifyChannel = "EMAIL" | "WHATSAPP";

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
