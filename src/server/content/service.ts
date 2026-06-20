import "server-only";
import { db } from "@/server/db";
import { listPublished } from "@/server/events/service";
import { getSystemSetting } from "@/server/campaigns/service";
import { parseGuideSections, cleanSections, type GuideSection } from "@/lib/content-gate";
import { fmtTime } from "@/lib/date-formats";
import { featureEnabled } from "@/server/settings/service";

/** Festival guide (customer-portal §3.7): event-derived basics + admin-edited sections, gated. */
export interface GuideData {
  eventName: string;
  sections: GuideSection[];
}

export async function getGuide(): Promise<GuideData | null> {
  if (!(await featureEnabled("guide"))) return null;
  const [event] = await listPublished();
  if (!event) return null;

  const adminSections = parseGuideSections(await getSystemSetting(`guide:${event.id}`));

  // Event-derived basics so a live event always has a useful guide (Timings bound to the event).
  const baseline: GuideSection[] = [];
  if (event.location) baseline.push({ heading: "Getting there", body: [event.location, "On-site and nearby parking — arrive early on peak evenings."] });
  baseline.push({ heading: "Timings", body: [`Gates open around ${fmtTime(event.startsAt)}`, `Winds down by ${fmtTime(event.endsAt)}`, "Last entry one hour before close."] });

  return { eventName: event.name, sections: cleanSections([...baseline, ...adminSections]) };
}

/** Published gallery photos for the active event (customer-portal §3.8). */
export async function getGalleryPhotos() {
  if (!(await featureEnabled("gallery"))) return [];
  const [event] = await listPublished();
  if (!event) return [];
  return db.galleryPhoto.findMany({
    where: { eventId: event.id, published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, url: true, caption: true },
  });
}
