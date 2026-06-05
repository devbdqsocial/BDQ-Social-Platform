import { Prisma } from "@prisma/client";
import { requireSuperAdminOnly } from "@/server/auth/guard";
import { db } from "@/server/db";
import { toCsv } from "@/lib/csv";
import { parseSkip } from "@/lib/utils";
import { buildAuditWhere } from "@/lib/audit-filters";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, "export-audit", 5, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    await requireSuperAdminOnly();
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const skip = parseSkip(sp.get("skip"));
  const where = buildAuditWhere({
    entity: sp.get("entity") || undefined,
    action: sp.get("action") || undefined,
    from: sp.get("from") || undefined,
    to: sp.get("to") || undefined,
  }) as Prisma.AuditLogWhereInput;

  const rows = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take: 500,
    include: { actor: { select: { name: true, email: true } } },
  });

  const csv = toCsv(
    rows.map((r) => ({
      time: r.createdAt.toISOString(),
      actor: r.actor?.name ?? r.actor?.email ?? r.actorId ?? "system",
      role: r.role ?? "",
      action: r.action,
      entity: r.entity,
      entityId: r.entityId ?? "",
      ip: r.ip ?? "",
    })),
    [
      { key: "time", label: "Time" },
      { key: "actor", label: "Actor" },
      { key: "role", label: "Role" },
      { key: "action", label: "Action" },
      { key: "entity", label: "Entity" },
      { key: "entityId", label: "Entity ID" },
      { key: "ip", label: "IP" },
    ],
  );

  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="audit-log.csv"' },
  });
}
