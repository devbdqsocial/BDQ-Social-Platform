import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { logError } from "@/lib/logger";
import type { Session } from "@/server/auth/guard";

/**
 * withAudit — single choke-point that records every admin/staff mutation (append-only AuditLog,
 * before/after) so nothing is missed (CLAUDE.md / Docs/ARCHITECTURE.md §12).
 *
 * `capture` returns the "before" snapshot (run before the mutation); the handler returns
 * { result, after }. Persisted only when DB is configured (slice 2); a no-op otherwise.
 */
interface AuditMeta {
  action: string;
  entity: string;
  entityId?: string;
  ip?: string;
  userAgent?: string;
}

export async function withAudit<TOut>(
  session: Session,
  meta: AuditMeta,
  capture: () => Promise<{ before: unknown; run: () => Promise<{ result: TOut; after: unknown }> }>,
): Promise<TOut> {
  const { before, run } = await capture();
  const { result, after } = await run();

  try {
    await db.auditLog.create({
      data: {
        actorId: session.userId,
        role: session.role,
        action: meta.action,
        entity: meta.entity,
        entityId: meta.entityId,
        before: (before ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        after: (after ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    });
  } catch (e) {
    // Never let an admin/staff mutation be recorded-as-success while its audit row is silently lost.
    logError("audit.persist", e, { action: meta.action, entity: meta.entity, actorId: session.userId });
  }
  return result;
}
