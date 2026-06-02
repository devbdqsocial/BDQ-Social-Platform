import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { buildAuditWhere, type AuditFilters } from "@/lib/audit-filters";

/** Read side of the audit trail (the SUPER_ADMIN viewer). Writing happens via withAudit. */

const PER_PAGE = 50;

export async function listAuditLogs(filters: AuditFilters, page = 1, perPage = PER_PAGE) {
  const where = buildAuditWhere(filters) as Prisma.AuditLogWhereInput;
  const current = Math.max(1, page);

  const [rows, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (current - 1) * perPage,
      take: perPage,
      include: { actor: { select: { name: true, email: true } } },
    }),
    db.auditLog.count({ where }),
  ]);

  return { rows, total, page: current, pages: Math.max(1, Math.ceil(total / perPage)) };
}

/** Distinct entity + action values to populate the filter dropdowns. */
export async function auditFilterOptions() {
  const [entities, actions] = await Promise.all([
    db.auditLog.findMany({ distinct: ["entity"], select: { entity: true }, orderBy: { entity: "asc" } }),
    db.auditLog.findMany({ distinct: ["action"], select: { action: true }, orderBy: { action: "asc" } }),
  ]);
  return { entities: entities.map((e) => e.entity), actions: actions.map((a) => a.action) };
}
