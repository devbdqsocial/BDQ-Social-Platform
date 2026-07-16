import "server-only";
import { unstable_cache } from "next/cache";
import { db } from "@/server/db";
import { withAudit, withAuditTx } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import { pathForSlug, FOOTER_LABEL } from "@/lib/legal-docs";
import { docSectionsSchema, type AssignDocInput, type CreateLegalDocInput, type UpdateLegalDocInput } from "@/server/schemas";
import type { DocSection } from "@/lib/legal-sections";
import type { LegalDocCategory, LegalDocAudience, LegalDocStatus } from "@prisma/client";

/**
 * Documents & Legal service (admin CRUD + read surfaces). Every doc — including the well-known
 * core ones — can be hard-deleted (owner decision): core public pages fall back to their built-in
 * JSX and the contract chain falls back to code, so nothing 404s; reseeding restores them. Signed
 * contracts are unaffected (termsSnapshot is self-contained). Every mutation is audited.
 */

/** Validate a doc's sections JSON at the read boundary. */
export function parseSections(sections: unknown): DocSection[] {
  return docSectionsSchema.parse(sections);
}

// ── reads ────────────────────────────────────────────────────────────────────────
export function getPublishedDoc(slug: string) {
  return db.legalDocument.findFirst({ where: { slug, status: "PUBLISHED" } });
}

export function listPublishedDocs(filter?: { audience?: LegalDocAudience[]; category?: LegalDocCategory[] }) {
  return db.legalDocument.findMany({
    where: {
      status: "PUBLISHED",
      ...(filter?.audience ? { audience: { in: filter.audience } } : {}),
      ...(filter?.category ? { category: { in: filter.category } } : {}),
    },
    orderBy: [{ category: "asc" }, { title: "asc" }],
  });
}

export function listDocsForAdmin() {
  return db.legalDocument.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
    include: { _count: { select: { assignments: true } } },
  });
}

export function getDocById(id: string) {
  return db.legalDocument.findUnique({ where: { id }, include: { _count: { select: { assignments: true } } } });
}

/** Admin lookup by slug (any status) — admin URLs are slug-based, not cuid-based. */
export function getDocBySlugForAdmin(slug: string) {
  return db.legalDocument.findUnique({ where: { slug }, include: { _count: { select: { assignments: true } } } });
}

export function listEventAssignments(eventId: string) {
  return db.docAssignment.findMany({
    where: { eventId },
    include: {
      doc: { select: { id: true, slug: true, title: true, status: true, version: true } },
      stallType: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

/** Published rules/policy docs assigned to an event (public event page + vendor docs hub). */
export function listEventRuleDocs(eventId: string) {
  return db.docAssignment.findMany({
    where: { eventId, kind: { in: ["EVENT_RULES", "EVENT_POLICY"] }, doc: { status: "PUBLISHED" } },
    include: { doc: true },
    orderBy: { createdAt: "asc" },
  });
}

/** Footer "Legal" links — published PUBLIC docs. Tag-cached; admin mutations revalidate. */
export const getFooterLegalLinks = unstable_cache(
  async () => {
    const docs = await db.legalDocument.findMany({
      where: { status: "PUBLISHED", audience: "PUBLIC" },
      select: { slug: true, title: true },
      orderBy: [{ category: "asc" }, { title: "asc" }],
    });
    return docs.map((d) => ({ label: FOOTER_LABEL[d.slug] ?? d.title, href: pathForSlug(d.slug) }));
  },
  ["legal-footer"],
  { tags: ["legal-docs"] },
);

// ── audited mutations ────────────────────────────────────────────────────────────
const STARTER_SECTIONS: DocSection[] = [{ heading: "1. Overview", body: "Write the first section here." }];

const bumpVersion = (v: string) => {
  const m = /^v(\d+)$/.exec(v);
  return m ? `v${Number(m[1]) + 1}` : "v2";
};

export function createDoc(session: Session, input: CreateLegalDocInput) {
  return withAudit(session, { action: "CREATE", entity: "LegalDocument" }, async () => ({
    before: null,
    run: async () => {
      const row = await db.legalDocument.create({
        data: { ...input, sections: STARTER_SECTIONS },
      });
      return { result: row, after: row };
    },
  }));
}

/** Editing a PUBLISHED doc goes live on save and bumps the version when sections changed. */
export function updateDoc(session: Session, input: UpdateLegalDocInput) {
  return withAudit(session, { action: "UPDATE", entity: "LegalDocument", entityId: input.id }, async () => {
    const before = await db.legalDocument.findUnique({ where: { id: input.id } });
    if (!before) throw new Error("Document not found");
    const sectionsChanged = JSON.stringify(before.sections) !== JSON.stringify(input.sections);
    return {
      before,
      run: async () => {
        const row = await db.legalDocument.update({
          where: { id: input.id },
          data: {
            title: input.title,
            category: input.category,
            audience: input.audience,
            sections: input.sections,
            ...(before.status === "PUBLISHED" && sectionsChanged ? { version: bumpVersion(before.version) } : {}),
          },
        });
        return { result: row, after: row };
      },
    };
  });
}

export function setDocStatus(session: Session, id: string, status: LegalDocStatus) {
  return withAudit(session, { action: "UPDATE", entity: "LegalDocument", entityId: id }, async () => {
    const before = await db.legalDocument.findUnique({ where: { id }, select: { slug: true, status: true, publishedAt: true } });
    if (!before) throw new Error("Document not found");
    return {
      before,
      run: async () => {
        const row = await db.legalDocument.update({
          where: { id },
          data: { status, ...(status === "PUBLISHED" && !before.publishedAt ? { publishedAt: new Date() } : {}) },
        });
        return { result: row, after: { status: row.status } };
      },
    };
  });
}

export function assignDoc(session: Session, input: AssignDocInput) {
  return withAudit(session, { action: "CREATE", entity: "DocAssignment" }, async () => ({
    before: null,
    run: async () => {
      const row = await db.$transaction(async (tx) => {
        // A contract slot (stall type / vendor category / event default) holds ONE contract —
        // selecting a new one replaces it.
        if (input.kind === "BOOKING_CONTRACT") {
          await tx.docAssignment.deleteMany({
            where: {
              eventId: input.eventId,
              stallTypeId: input.stallTypeId ?? null,
              vendorCategory: input.vendorCategory ?? null,
              kind: "BOOKING_CONTRACT",
            },
          });
        }
        return tx.docAssignment.create({
          data: {
            docId: input.docId,
            eventId: input.eventId,
            stallTypeId: input.stallTypeId ?? null,
            vendorCategory: input.vendorCategory ?? null,
            kind: input.kind,
          },
        });
      });
      return { result: row, after: row };
    },
  }));
}

/** Permanent delete (cascades this doc's event assignments; audited in the same transaction).
 *  Returns the deleted row so callers can revalidate its public path. */
export function deleteDoc(session: Session, id: string) {
  return withAuditTx(session, { action: "DELETE", entity: "LegalDocument", entityId: id }, async (tx) => {
    const before = await tx.legalDocument.findUnique({ where: { id }, include: { _count: { select: { assignments: true } } } });
    if (!before) throw new Error("Document not found");
    return {
      before,
      run: async (run) => {
        await run.docAssignment.deleteMany({ where: { docId: id } });
        await run.legalDocument.delete({ where: { id } });
        return { result: before, after: null };
      },
    };
  });
}

export function unassignDoc(session: Session, id: string) {
  return withAudit(session, { action: "DELETE", entity: "DocAssignment", entityId: id }, async () => {
    const before = await db.docAssignment.findUnique({ where: { id } });
    if (!before) throw new Error("Assignment not found");
    return {
      before,
      run: async () => {
        await db.docAssignment.delete({ where: { id } });
        return { result: before, after: null };
      },
    };
  });
}
