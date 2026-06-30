import type { WhatsAppProvider } from "@/lib/whatsapp";

export type CampaignTemplateContact = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

const DEFAULT_LANG = "en";

export function normalizeTemplateParams(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return [];
}

export function renderCampaignTemplateParams(params: string[], contact: CampaignTemplateContact): string[] {
  const vars = {
    name: contact.name || "",
    email: contact.email || "",
    phone: contact.phone || "",
  };
  return params.map((p) => p.replace(/\{(name|email|phone)\}/g, (_, key: keyof typeof vars) => vars[key]));
}

export function renderCampaignTextBody(body: string, contact: CampaignTemplateContact): string {
  return renderCampaignTemplateParams([body], contact)[0] || "";
}

export function buildCampaignWhatsAppPayload(o: {
  templateName?: string | null;
  templateLang?: string | null;
  templateParams?: unknown;
  contact: CampaignTemplateContact;
}) {
  return {
    whatsappTemplateName: (o.templateName || "").trim(),
    whatsappTemplateLang: (o.templateLang || DEFAULT_LANG).trim() || DEFAULT_LANG,
    whatsappTemplateParams: renderCampaignTemplateParams(normalizeTemplateParams(o.templateParams), o.contact),
  };
}

export function whatsAppCampaignReadinessError(o: {
  configured: boolean;
  provider?: WhatsAppProvider | null;
  templateName?: string | null;
  body?: string | null;
}): string | null {
  if (!o.configured) return "WhatsApp is not configured.";
  if (o.provider === "openwa") {
    if (!o.body?.trim()) return "Write a WhatsApp message body before sending.";
    return null;
  }
  if (!o.templateName?.trim()) return "Choose an approved WhatsApp template before sending.";
  return null;
}
