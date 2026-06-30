const STORAGE_KEY = "bdq:utm:v1";
const KEY_MAP: Record<string, "source" | "medium" | "campaign" | "term" | "content" | "ref"> = {
  utm_source: "source",
  source: "source",
  utm_medium: "medium",
  medium: "medium",
  utm_campaign: "campaign",
  campaign: "campaign",
  utm_term: "term",
  term: "term",
  utm_content: "content",
  content: "content",
  ref: "ref",
};

export type UtmData = Partial<Record<(typeof KEY_MAP)[keyof typeof KEY_MAP], string>>;

function cleanValue(value: string) {
  return value.trim().replace(/[\u0000-\u001F\u007F<>]/g, "").slice(0, 120);
}

export function utmFromSearch(search: string): UtmData | undefined {
  const params = new URLSearchParams(search);
  const out: UtmData = {};
  for (const [key, target] of Object.entries(KEY_MAP)) {
    const value = params.get(key);
    if (value) {
      const cleaned = cleanValue(value);
      if (cleaned) out[target] = cleaned;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

export function readStoredUtm(): UtmData | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return undefined;
    const parsed = JSON.parse(raw) as UtmData;
    return parsed && typeof parsed === "object" && Object.keys(parsed).length ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export function writeStoredUtm(utm: UtmData) {
  if (typeof window === "undefined" || !Object.keys(utm).length) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(utm));
}
