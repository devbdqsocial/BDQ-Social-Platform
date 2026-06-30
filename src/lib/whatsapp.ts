import { cloudConfigured, sendCloudWhatsApp, sendCloudWhatsAppText } from "@/lib/whatsapp-cloud";
import { interaktConfigured, sendInteraktWhatsApp } from "@/lib/interakt";
import {
  openWaCampaignThrottleMs,
  openWaConfigured,
  sendOpenWaImage,
  sendOpenWaText,
  sendOpenWaWhatsApp,
  type OpenWaImageMessage,
} from "@/lib/openwa";

/**
 * WhatsApp provider facade. One interface, swappable backends (CLAUDE.md adapter rule):
 *   - "cloud"    → official WhatsApp Cloud API (Meta Graph API). Default/recommended.
 *   - "interakt" → Interakt BSP.
 * Selected by WHATSAPP_PROVIDER, else auto-detected from whichever keys are present. Dormant
 * (sendWhatsApp returns { skipped: true }) when nothing is configured, so the pipeline runs keyless.
 */

export interface WhatsAppMessage {
  phone: string; // E.164, e.g. +9198...
  template: string;
  lang?: string;
  /** ordered template body variables */
  params: string[];
}

export type WhatsAppProvider = "cloud" | "interakt" | "openwa";
export type WhatsAppSendResult = { skipped: true } | { id: string };

/** Pure selector — extracted so it's unit-testable without importing process.env. */
export function pickProvider(o: {
  explicit?: string;
  cloud: boolean;
  interakt: boolean;
  openwa?: boolean;
}): WhatsAppProvider | null {
  const p = o.explicit?.toLowerCase();
  if (p === "cloud") return o.cloud ? "cloud" : null;
  if (p === "interakt") return o.interakt ? "interakt" : null;
  if (p === "openwa") return o.openwa ? "openwa" : null;
  if (o.cloud) return "cloud";
  if (o.interakt) return "interakt";
  if (o.openwa) return "openwa";
  return null;
}

export function whatsAppProvider(): WhatsAppProvider | null {
  return pickProvider({
    explicit: process.env.WHATSAPP_PROVIDER,
    cloud: cloudConfigured(),
    interakt: interaktConfigured(),
    openwa: openWaConfigured(),
  });
}

export function whatsAppConfigured(): boolean {
  return whatsAppProvider() !== null;
}

export async function sendWhatsApp(msg: WhatsAppMessage): Promise<WhatsAppSendResult> {
  const provider = whatsAppProvider();
  if (provider === "cloud") return sendCloudWhatsApp(msg);
  if (provider === "interakt") return sendInteraktWhatsApp(msg);
  if (provider === "openwa") return sendOpenWaWhatsApp(msg);
  return { skipped: true };
}

export function assertWhatsAppSent(result: WhatsAppSendResult): asserts result is { id: string } {
  if ("skipped" in result) throw new Error("WhatsApp provider is not configured.");
}

/** Free-text send (campaign body or test message). */
export async function sendWhatsAppText(phone: string, body: string): Promise<WhatsAppSendResult> {
  const provider = whatsAppProvider();
  if (provider === "cloud") return sendCloudWhatsAppText(phone, body);
  if (provider === "openwa") return sendOpenWaText(phone, body);
  return { skipped: true };
}

/** Image media send. Currently implemented for OpenWA ticket/test QR delivery. */
export async function sendWhatsAppImage(msg: OpenWaImageMessage): Promise<WhatsAppSendResult> {
  if (whatsAppProvider() === "openwa") return sendOpenWaImage(msg);
  return { skipped: true };
}

export function whatsAppCampaignThrottleMs(): number {
  return whatsAppProvider() === "openwa" ? openWaCampaignThrottleMs() : 60;
}
