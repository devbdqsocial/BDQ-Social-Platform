/**
 * Content gates for the companion surfaces (customer-portal §3.7/§3.8, R3.8). Pure + DB-free.
 * Keeps hollow surfaces hidden until there's real content (failure-analysis empty-content risk):
 * the gallery needs ≥8 published photos; a guide section needs a heading + at least one body line.
 */

export const GALLERY_MIN_PHOTOS = 8;

export const galleryReady = (publishedCount: number): boolean => publishedCount >= GALLERY_MIN_PHOTOS;

export interface GuideSection {
  heading: string;
  body: string[];
}

/** Trim + drop empty body lines, then drop any section missing a heading or all-empty body. */
export function cleanSections(sections: GuideSection[]): GuideSection[] {
  return sections
    .map((s) => ({ heading: s.heading.trim(), body: s.body.map((b) => b.trim()).filter(Boolean) }))
    .filter((s) => s.heading.length > 0 && s.body.length > 0);
}

export const guideReady = (sections: GuideSection[]): boolean => cleanSections(sections).length > 0;

/** Parse the admin-edited guide JSON (`SystemSetting guide:<eventId>`) defensively. */
export function parseGuideSections(raw: string | null): GuideSection[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as { sections?: unknown };
    const sections = Array.isArray(parsed?.sections) ? parsed.sections : [];
    return cleanSections(
      sections.flatMap((s): GuideSection[] => {
        if (!s || typeof s !== "object") return [];
        const o = s as { heading?: unknown; body?: unknown };
        const heading = typeof o.heading === "string" ? o.heading : "";
        const body = Array.isArray(o.body) ? o.body.filter((b): b is string => typeof b === "string") : typeof o.body === "string" ? [o.body] : [];
        return [{ heading, body }];
      }),
    );
  } catch {
    return [];
  }
}
