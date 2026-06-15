import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

/**
 * Admin gallery curation (admin-portal §6.2). Upload → order (sortOrder) → caption → publish.
 * The customer gallery (server/content/service.ts) shows published photos once ≥8 exist
 * (content-gate GALLERY_MIN_PHOTOS). All mutations audited (locked rule).
 */

export function listGalleryForAdmin(eventId: string) {
  return db.galleryPhoto.findMany({
    where: { eventId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export function addGalleryPhoto(session: Session, eventId: string, url: string, publicId: string) {
  return withAudit(session, { action: "CREATE", entity: "GalleryPhoto", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      const last = await db.galleryPhoto.findFirst({ where: { eventId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
      const photo = await db.galleryPhoto.create({ data: { eventId, url, publicId, sortOrder: (last?.sortOrder ?? -1) + 1 } });
      return { result: photo, after: { id: photo.id } };
    },
  }));
}

export function setGalleryCaption(session: Session, id: string, caption: string) {
  return withAudit(session, { action: "UPDATE", entity: "GalleryPhoto", entityId: id }, async () => {
    const before = await db.galleryPhoto.findUnique({ where: { id }, select: { caption: true } });
    return {
      before,
      run: async () => {
        const photo = await db.galleryPhoto.update({ where: { id }, data: { caption: caption.trim() || null } });
        return { result: photo, after: { caption: photo.caption } };
      },
    };
  });
}

export function setGalleryPublished(session: Session, id: string, published: boolean) {
  return withAudit(session, { action: "UPDATE", entity: "GalleryPhoto", entityId: id }, async () => {
    const before = await db.galleryPhoto.findUnique({ where: { id }, select: { published: true } });
    return {
      before,
      run: async () => {
        const photo = await db.galleryPhoto.update({ where: { id }, data: { published } });
        return { result: photo, after: { published: photo.published } };
      },
    };
  });
}

export function publishAllGallery(session: Session, eventId: string) {
  return withAudit(session, { action: "UPDATE", entity: "GalleryPhoto", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      const res = await db.galleryPhoto.updateMany({ where: { eventId, published: false }, data: { published: true } });
      return { result: { count: res.count }, after: { publishedNow: res.count } };
    },
  }));
}

export function deleteGalleryPhoto(session: Session, id: string) {
  return withAudit(session, { action: "DELETE", entity: "GalleryPhoto", entityId: id }, async () => {
    const before = await db.galleryPhoto.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        await db.galleryPhoto.delete({ where: { id } });
        return { result: { id }, after: null };
      },
    };
  });
}

/** Swap a photo's order with its neighbour in the given direction (manual reorder, no dnd lib). */
export function moveGalleryPhoto(session: Session, id: string, dir: "up" | "down") {
  return withAudit(session, { action: "UPDATE", entity: "GalleryPhoto", entityId: id }, async () => {
    const photo = await db.galleryPhoto.findUnique({ where: { id }, select: { id: true, eventId: true, sortOrder: true } });
    return {
      before: photo,
      run: async () => {
        if (!photo) return { result: { ok: false }, after: null };
        const neighbour = await db.galleryPhoto.findFirst({
          where: { eventId: photo.eventId, sortOrder: dir === "up" ? { lt: photo.sortOrder } : { gt: photo.sortOrder } },
          orderBy: { sortOrder: dir === "up" ? "desc" : "asc" },
          select: { id: true, sortOrder: true },
        });
        if (!neighbour) return { result: { ok: true }, after: null };
        await db.$transaction([
          db.galleryPhoto.update({ where: { id: photo.id }, data: { sortOrder: neighbour.sortOrder } }),
          db.galleryPhoto.update({ where: { id: neighbour.id }, data: { sortOrder: photo.sortOrder } }),
        ]);
        return { result: { ok: true }, after: { swappedWith: neighbour.id } };
      },
    };
  });
}
