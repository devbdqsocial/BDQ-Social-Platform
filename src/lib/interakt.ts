import type { WhatsAppMessage } from "@/lib/whatsapp";

/**
 * Interakt (WhatsApp BSP) provider — an alternate backend behind the WhatsApp facade. Dormant until
 * INTERAKT_API_KEY is set; `sendInteraktWhatsApp` no-ops ({ skipped: true }) when unconfigured.
 */

export function interaktConfigured(): boolean {
  return !!process.env.INTERAKT_API_KEY;
}

const DEFAULT_BASE = "https://api.interakt.ai/v1/public/message/";

export async function sendInteraktWhatsApp(
  msg: WhatsAppMessage,
): Promise<{ skipped: true } | { id: string }> {
  if (!interaktConfigured()) return { skipped: true };

  const base = process.env.INTERAKT_BASE_URL || DEFAULT_BASE;
  const [countryCode, ...rest] = msg.phone.replace(/^\+/, "").match(/^(\d{1,3})(\d+)$/)?.slice(1) ?? ["91", msg.phone];
  const phoneNumber = rest.join("");

  const res = await fetch(base, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${process.env.INTERAKT_API_KEY}`,
    },
    body: JSON.stringify({
      countryCode: `+${countryCode}`,
      phoneNumber,
      type: "Template",
      template: { name: msg.template, languageCode: msg.lang || process.env.WHATSAPP_TEMPLATE_LANG || "en", bodyValues: msg.params },
    }),
  });
  if (!res.ok) throw new Error(`Interakt send failed: ${res.status}`);
  const json = (await res.json().catch(() => ({}))) as { id?: string };
  return { id: json.id ?? "sent" };
}
