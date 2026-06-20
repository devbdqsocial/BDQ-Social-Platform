import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";

/** Security Center data: 2FA coverage, recent admin sign-ins, active login locks. Reuses existing tables. */

export async function securityOverview() {
  const [admins, recentLogins, locks] = await Promise.all([
    db.user.findMany({ where: { role: { in: ["SUPER_ADMIN", "ADMIN", "STAFF"] } }, select: { totpEnabled: true } }),
    db.auditLog.findMany({
      where: { action: "admin.login" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { createdAt: true, ip: true, userAgent: true, actor: { select: { email: true } } },
    }),
    db.rateLimit.findMany({ where: { key: { startsWith: "admin-auth" } }, select: { key: true, count: true, resetAt: true } }),
  ]);

  return {
    adminCount: admins.length,
    with2fa: admins.filter((a) => a.totpEnabled).length,
    recentLogins: recentLogins.map((l) => ({ at: l.createdAt.toISOString(), ip: l.ip, ua: l.userAgent, email: l.actor?.email ?? null })),
    activeLocks: locks.filter((l) => l.resetAt > new Date()).length,
  };
}

/** Revoke every admin/staff session except the caller's (bumps tokenVersion). Audited, SUPER_ADMIN only. */
export function forceLogoutAllAdmins(session: Session) {
  return withAudit(session, { action: "security.force_logout_all", entity: "User" }, async () => ({
    before: null,
    run: async () => {
      const res = await db.user.updateMany({
        where: { role: { in: ["SUPER_ADMIN", "ADMIN", "STAFF"] }, id: { not: session.userId } },
        data: { tokenVersion: { increment: 1 } },
      });
      return { result: res.count, after: { count: res.count } };
    },
  }));
}
