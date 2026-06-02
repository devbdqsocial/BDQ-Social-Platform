import { cloudConfigured, sendCloudWhatsApp } from "@/lib/whatsapp-cloud";
import { interaktConfigured, sendInteraktWhatsApp } from "@/lib/interakt";

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
  /** ordered template body variables */
  params: string[];
}

export type WhatsAppProvider = "cloud" | "interakt";

/** Pure selector — extracted so it's unit-testable without importing process.env. */
export function pickProvider(o: {
  explicit?: string;
  cloud: boolean;
  interakt: boolean;
}): WhatsAppProvider | null {
  const p = o.explicit?.toLowerCase();
  if (p === "cloud") return o.cloud ? "cloud" : null;
  if (p === "interakt") return o.interakt ? "interakt" : null;
  if (o.cloud) return "cloud";
  if (o.interakt) return "interakt";
  return null;
}

export function whatsAppProvider(): WhatsAppProvider | null {
  return pickProvider({
    explicit: process.env.WHATSAPP_PROVIDER,
    cloud: cloudConfigured(),
    interakt: interaktConfigured(),
  });
}

export function whatsAppConfigured(): boolean {
  return whatsAppProvider() !== null;
}

export async function sendWhatsApp(msg: WhatsAppMessage): Promise<{ skipped: true } | { id: string }> {
  const provider = whatsAppProvider();
  if (provider === "cloud") return sendCloudWhatsApp(msg);
  if (provider === "interakt") return sendInteraktWhatsApp(msg);
  return { skipped: true };
}
