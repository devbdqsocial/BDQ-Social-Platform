import type { WhatsAppMessage } from "@/lib/whatsapp";

/**
 * Official WhatsApp Cloud API (Meta Graph API) adapter. Free tier, template-based, plain HTTPS —
 * runs anywhere (incl. Vercel). Dormant until WHATSAPP_CLOUD_TOKEN + WHATSAPP_CLOUD_PHONE_ID are set.
 */

const DEFAULT_VERSION = "v21.0";
const DEFAULT_LANG = "en";

export function cloudConfigured(): boolean {
  return !!(process.env.WHATSAPP_CLOUD_TOKEN && process.env.WHATSAPP_CLOUD_PHONE_ID);
}

/** Pure — build the Graph API request body for a template message. */
export function buildCloudPayload(msg: WhatsAppMessage, opts: { template?: string; lang?: string } = {}) {
  return {
    messaging_product: "whatsapp",
    to: msg.phone.replace(/\D/g, ""), // digits only, country code included
    type: "template",
    template: {
      name: opts.template ?? msg.template,
      language: { code: opts.lang ?? DEFAULT_LANG },
      components: [{ type: "body", parameters: msg.params.map((text) => ({ type: "text", text })) }],
    },
  };
}

export async function sendCloudWhatsApp(msg: WhatsAppMessage): Promise<{ skipped: true } | { id: string }> {
  if (!cloudConfigured()) return { skipped: true };

  const version = process.env.WHATSAPP_CLOUD_API_VERSION || DEFAULT_VERSION;
  const url = `https://graph.facebook.com/${version}/${process.env.WHATSAPP_CLOUD_PHONE_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}`,
    },
    body: JSON.stringify(buildCloudPayload(msg, { lang: msg.lang || process.env.WHATSAPP_TEMPLATE_LANG })),
  });
  if (!res.ok) throw new Error(`WhatsApp Cloud send failed: ${res.status}`);
  const json = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[] };
  return { id: json.messages?.[0]?.id ?? "sent" };
}

/**
 * Free-text WhatsApp message (campaign body). Note: Meta only permits free-form text inside the
 * 24h customer-service window; cold marketing must use approved templates. Dormant when unconfigured.
 */
export async function sendCloudWhatsAppText(phone: string, body: string): Promise<{ skipped: true } | { id: string }> {
  if (!cloudConfigured()) return { skipped: true };

  const version = process.env.WHATSAPP_CLOUD_API_VERSION || DEFAULT_VERSION;
  const url = `https://graph.facebook.com/${version}/${process.env.WHATSAPP_CLOUD_PHONE_ID}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.WHATSAPP_CLOUD_TOKEN}`,
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to: phone.replace(/\D/g, ""), type: "text", text: { body } }),
  });
  if (!res.ok) throw new Error(`WhatsApp Cloud text send failed: ${res.status}`);
  const json = (await res.json().catch(() => ({}))) as { messages?: { id?: string }[] };
  return { id: json.messages?.[0]?.id ?? "sent" };
}
