import { Prisma } from "@prisma/client";
import { runInDbTransaction } from "@/server/db";
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

type AuditTx = Prisma.TransactionClient;

async function persistAudit(session: Session, meta: AuditMeta, before: unknown, after: unknown, tx: AuditTx) {
  try {
    await tx.auditLog.create({
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
    throw e;
  }
}

export async function withAudit<TOut>(
  session: Session,
  meta: AuditMeta,
  capture: () => Promise<{ before: unknown; run: () => Promise<{ result: TOut; after: unknown }> }>,
): Promise<TOut> {
  return runInDbTransaction(async (tx) => {
    const { before, run } = await capture();
    const { result, after } = await run();
    await persistAudit(session, meta, before, after, tx);
    return result;
  });
}

export async function withAuditTx<TOut>(
  session: Session,
  meta: AuditMeta,
  capture: (tx: AuditTx) => Promise<{ before: unknown; run: (tx: AuditTx) => Promise<{ result: TOut; after: unknown }> }>,
): Promise<TOut> {
  return runInDbTransaction(async (tx) => {
    const { before, run } = await capture(tx);
    const { result, after } = await run(tx);
    await persistAudit(session, meta, before, after, tx);
    return result;
  });
}
