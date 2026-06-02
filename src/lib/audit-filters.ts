/** Pure builder for the audit-log query filter (no db import → unit-testable). */

export interface AuditFilters {
  entity?: string;
  action?: string;
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD (inclusive, end-of-day)
}

export function buildAuditWhere(f: AuditFilters): Record<string, unknown> {
  const where: Record<string, unknown> = {};
  if (f.entity) where.entity = f.entity;
  if (f.action) where.action = f.action;
  if (f.from || f.to) {
    const createdAt: { gte?: Date; lte?: Date } = {};
    if (f.from) createdAt.gte = new Date(`${f.from}T00:00:00`);
    if (f.to) createdAt.lte = new Date(`${f.to}T23:59:59.999`);
    where.createdAt = createdAt;
  }
  return where;
}
