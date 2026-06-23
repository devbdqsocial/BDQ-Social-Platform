import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import type { ArtistCreateInput, ArtistUpdateInput } from "@/server/schemas";

/** Admin-managed artist roster (no artist login). Bookings/settlement land in later phases. */

export function listArtists(opts?: { type?: string; includeArchived?: boolean }) {
  return db.artistProfile.findMany({
    where: {
      ...(opts?.includeArchived ? {} : { archived: false }),
      ...(opts?.type ? { type: opts.type as ArtistCreateInput["type"] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: {
      id: true,
      stageName: true,
      type: true,
      genre: true,
      city: true,
      askingFeePaise: true,
      archived: true,
      createdAt: true,
      _count: { select: { bookings: true } },
    },
  });
}

export function getArtist(id: string) {
  return db.artistProfile.findUnique({
    where: { id },
    include: {
      assets: { orderBy: { createdAt: "desc" } },
      bookings: {
        orderBy: { createdAt: "desc" },
        include: { event: { select: { name: true, startsAt: true } }, payouts: true },
      },
    },
  });
}

export function createArtist(session: Session, input: ArtistCreateInput) {
  return withAudit(session, { action: "CREATE", entity: "ArtistProfile" }, async () => ({
    before: null,
    run: async () => {
      const artist = await db.artistProfile.create({ data: input });
      return { result: artist, after: artist };
    },
  }));
}

export function updateArtist(session: Session, input: ArtistUpdateInput) {
  const { id, ...data } = input;
  return withAudit(session, { action: "UPDATE", entity: "ArtistProfile", entityId: id }, async () => {
    const before = await db.artistProfile.findUnique({ where: { id } });
    return {
      before,
      run: async () => {
        const artist = await db.artistProfile.update({ where: { id }, data });
        return { result: artist, after: artist };
      },
    };
  });
}

export function setArchived(session: Session, id: string, archived: boolean) {
  return withAudit(session, { action: archived ? "ARCHIVE" : "UNARCHIVE", entity: "ArtistProfile", entityId: id }, async () => {
    const before = await db.artistProfile.findUnique({ where: { id }, select: { archived: true } });
    return {
      before,
      run: async () => {
        const artist = await db.artistProfile.update({ where: { id }, data: { archived } });
        return { result: { id }, after: { archived: artist.archived } };
      },
    };
  });
}
