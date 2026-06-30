import type { WhatsAppMessage, WhatsAppSendResult } from "@/lib/whatsapp";

const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_CAMPAIGN_THROTTLE_MS = 1500;
const MAX_TEXT_LENGTH = 4096;
const MAX_CAPTION_LENGTH = 1024;

export interface OpenWaImageMessage {
  phone: string;
  buffer: Buffer;
  filename: string;
  caption?: string;
}

type OpenWaSendResponse = { messageId?: string; id?: string };

function envValue(key: string): string {
  return (process.env[key] || "").trim();
}

function openWaBaseUrl(): string {
  return envValue("OPENWA_BASE_URL").replace(/\/+$/, "");
}

function openWaSessionId(): string {
  return envValue("OPENWA_SESSION_ID");
}

function openWaTimeoutMs(): number {
  const n = Number(process.env.OPENWA_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_TIMEOUT_MS;
}

export function openWaCampaignThrottleMs(): number {
  const n = Number(process.env.OPENWA_CAMPAIGN_THROTTLE_MS);
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_CAMPAIGN_THROTTLE_MS;
}

export function openWaConfigured(): boolean {
  return !!(openWaBaseUrl() && envValue("OPENWA_API_KEY") && openWaSessionId());
}

export function openWaTicketQrEnabled(): boolean {
  return process.env.OPENWA_SEND_TICKET_QR !== "false";
}

export function toOpenWaChatId(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) throw new Error("OpenWA recipient phone is missing.");
  return `${digits}@c.us`;
}

function openWaEndpoint(kind: "send-text" | "send-image"): string {
  return `${openWaBaseUrl()}/api/sessions/${encodeURIComponent(openWaSessionId())}/messages/${kind}`;
}

function ensureText(text: string, max: number, label: string): string {
  const trimmed = text.trim();
  if (!trimmed) throw new Error(`${label} is required.`);
  if (trimmed.length > max) throw new Error(`${label} must be ${max} characters or less.`);
  return trimmed;
}

function renderTemplateText(msg: WhatsAppMessage): string {
  const [a = "", b = "", c = ""] = msg.params;
  const name = msg.template.toLowerCase();
  if (name.includes("ticket")) return `Your BDQ Social tickets are confirmed for ${a}. Tickets: ${b}. View QR: ${c}`;
  if (name.includes("waitlist")) return `You're on the BDQ Social waitlist. Updates: ${a}`;
  return [msg.template, ...msg.params].filter(Boolean).join("\n");
}

async function postOpenWa(kind: "send-text" | "send-image", body: unknown): Promise<WhatsAppSendResult> {
  if (!openWaConfigured()) return { skipped: true };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), openWaTimeoutMs());
  try {
    const res = await fetch(openWaEndpoint(kind), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": envValue("OPENWA_API_KEY"),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`OpenWA ${kind} failed: ${res.status}${text ? ` ${text.slice(0, 180)}` : ""}`);
    }
    const json = (await res.json().catch(() => ({}))) as OpenWaSendResponse;
    return { id: json.messageId || json.id || "sent" };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") throw new Error(`OpenWA ${kind} timed out.`);
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

export function buildOpenWaTextPayload(phone: string, text: string) {
  return { chatId: toOpenWaChatId(phone), text: ensureText(text, MAX_TEXT_LENGTH, "WhatsApp message") };
}

export function buildOpenWaImagePayload(msg: OpenWaImageMessage) {
  return {
    chatId: toOpenWaChatId(msg.phone),
    base64: msg.buffer.toString("base64"),
    mimetype: "image/png",
    filename: msg.filename,
    caption: msg.caption ? ensureText(msg.caption, MAX_CAPTION_LENGTH, "WhatsApp media caption") : undefined,
  };
}

export function buildOpenWaTemplatePayload(msg: WhatsAppMessage) {
  return buildOpenWaTextPayload(msg.phone, renderTemplateText(msg));
}

export function sendOpenWaText(phone: string, body: string): Promise<WhatsAppSendResult> {
  return postOpenWa("send-text", buildOpenWaTextPayload(phone, body));
}

export function sendOpenWaWhatsApp(msg: WhatsAppMessage): Promise<WhatsAppSendResult> {
  return postOpenWa("send-text", buildOpenWaTemplatePayload(msg));
}

export function sendOpenWaImage(msg: OpenWaImageMessage): Promise<WhatsAppSendResult> {
  return postOpenWa("send-image", buildOpenWaImagePayload(msg));
}
