import "server-only";
import { db } from "@/server/db";
import { withAudit, withAuditTx } from "@/server/audit";
import { hashPassword } from "@/lib/password";
import { permissionsForPreset, type StaffPreset } from "@/lib/staff-presets";
import type { Permission, Session } from "@/server/auth/guard";

/** SUPER_ADMIN-managed staff accounts (P3.1). Staff sign in via /api/auth/admin (password, optional TOTP). */

export async function listStaff() {
  const rows = await db.user.findMany({
    where: { role: { in: ["STAFF", "ADMIN"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, role: true, permissions: true, passwordHash: true, totpEnabled: true, createdAt: true },
  });
  // never leak the hash — expose only whether the account can sign in
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    permissions: r.permissions,
    totpEnabled: r.totpEnabled,
    active: !!r.passwordHash,
    createdAt: r.createdAt,
  }));
}

/** Minimal credential info for link actions (resend invite / send reset). */
export function getStaffCredentialInfo(id: string) {
  return db.user.findUnique({ where: { id }, select: { email: true, role: true, passwordHash: true } });
}

/** One teammate's full profile for the detail page: identity + security posture + recent activity.
 *  Last login and activity are derived from AuditLog (no session table exists — auth is stateless JWT). */
export async function getStaffDetail(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, role: true, permissions: true, passwordHash: true, totpEnabled: true, createdAt: true },
  });
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN" && user.role !== "SUPER_ADMIN")) return null;

  const [lastLogin, activity] = await Promise.all([
    db.auditLog.findFirst({
      where: { actorId: id, action: "admin.login" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, ip: true },
    }),
    db.auditLog.findMany({
      where: { OR: [{ actorId: id }, { entity: "User", entityId: id }] },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, action: true, entity: true, createdAt: true, actorId: true },
    }),
  ]);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions,
    totpEnabled: user.totpEnabled,
    active: !!user.passwordHash,
    createdAt: user.createdAt,
    lastLoginAt: lastLogin?.createdAt ?? null,
    lastLoginIp: lastLogin?.ip ?? null,
    activity,
  };
}

export class StaffEmailTakenError extends Error {
  constructor() {
    super("EMAIL_TAKEN");
    this.name = "StaffEmailTakenError";
  }
}

/** Create or update a staff account by email. A password (re)sets their sign-in credential. */
export function upsertStaff(
  session: Session,
  input: { email: string; name?: string; role: "STAFF" | "ADMIN"; preset?: StaffPreset; password?: string },
) {
  const email = input.email.toLowerCase();
  const permissions = input.preset ? permissionsForPreset(input.preset) : [];

  return withAudit(session, { action: "UPSERT", entity: "User", entityId: email }, async () => {
    const before = await db.user.findUnique({ where: { email }, select: { role: true, permissions: true } });
    if (before && before.role !== "STAFF" && before.role !== "ADMIN") throw new StaffEmailTakenError();
    const passwordHash = input.password ? await hashPassword(input.password) : undefined;

    return {
      before,
      run: async () => {
        const user = await db.user.upsert({
          where: { email },
          // bump tokenVersion so a permission change takes effect on the next request (revocation)
          update: { name: input.name, role: input.role, permissions, tokenVersion: { increment: 1 }, ...(passwordHash ? { passwordHash } : {}) },
          create: { email, name: input.name, role: input.role, permissions, passwordHash },
        });
        return { result: user, after: { role: user.role, permissions: user.permissions } };
      },
    };
  });
}

/**
 * Fine-grained: sets a staff member's exact permission set and optional role.
 * Only a SUPER_ADMIN is permitted to assign the ADMIN role or modify the permissions/role of an ADMIN user.
 * Standard ADMINs are restricted to modifying standard STAFF users.
 *
 * @throws {Error} If permission or role changes cross authorization boundaries.
 */
export function setStaffPermissions(
  session: Session,
  id: string,
  permissions: Permission[],
  role?: "STAFF" | "ADMIN"
) {
  return withAudit(session, { action: "UPDATE", entity: "User", entityId: id }, async () => {
    const before = await db.user.findUnique({ where: { id }, select: { role: true, permissions: true } });
    
    const isTargetAdmin = before?.role === "ADMIN";
    const wantsAdminRole = role === "ADMIN";
    
    // Strict guard: standard ADMINs cannot modify ADMIN users or escalate users to the ADMIN role.
    if ((isTargetAdmin || wantsAdminRole) && session.role !== "SUPER_ADMIN") {
      throw new Error("Only Super Admin can manage Admin accounts or assign Admin role.");
    }

    return {
      before,
      run: async () => {
        const data: { permissions: Permission[]; tokenVersion: { increment: number }; role?: "STAFF" | "ADMIN" } = {
          permissions,
          tokenVersion: { increment: 1 }
        };
        if (role && session.role === "SUPER_ADMIN") {
          data.role = role;
        }
        const u = await db.user.update({ where: { id }, data });
        return { result: u, after: { role: u.role, permissions: u.permissions } };
      },
    };
  });
}


/**
 * Revokes active access credentials and permissions for a teammate.
 * Standard ADMINs are only allowed to revoke access for standard STAFF members.
 * Only SUPER_ADMINs can revoke access for ADMIN accounts. Under no circumstances can a SUPER_ADMIN account be disabled here.
 *
 * @throws {Error} If credentials or authorization boundaries are violated.
 */
export function removeStaffAccess(session: Session, id: string) {
  return withAudit(session, { action: "DISABLE", entity: "User", entityId: id }, async () => {
    const before = await db.user.findUnique({ where: { id }, select: { role: true, permissions: true } });
    
    if (before && before.role === "SUPER_ADMIN") {
      throw new Error("Cannot modify Super Admin accounts.");
    }
    if (before && before.role === "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new Error("Only Super Admin can modify Admin accounts.");
    }

    return {
      before,
      run: async () => {
        const u = await db.user.update({
          where: { id },
          data: { role: "STAFF", passwordHash: null, permissions: [], tokenVersion: { increment: 1 } }
        });
        return { result: u, after: { role: u.role, permissions: [] } };
      },
    };
  });
}

/**
 * Permanently delete a teammate row (hard delete). Blocked for accounts with financial/gate records
 * (orders, check-ins, coupon redemptions, a vendor profile) to protect data integrity — those should
 * use removeStaffAccess (soft) instead. Audit logs + waitlist entries are detached (actor nulled),
 * then the row is deleted, all in one transaction.
 */
export function hardDeleteStaff(session: Session, id: string) {
  return withAuditTx(session, { action: "DELETE", entity: "User", entityId: id }, async (tx) => {
    const before = await tx.user.findUnique({
      where: { id },
      select: {
        role: true, email: true, name: true,
        _count: { select: { orders: true, checkIns: true, couponRedemptions: true } },
        vendorProfile: { select: { id: true } },
      },
    });
    if (!before) throw new Error("Teammate not found.");
    if (before.role === "SUPER_ADMIN") throw new Error("Cannot delete a Super Admin account.");
    if (before.role !== "STAFF" && before.role !== "ADMIN") throw new Error("Only teammates can be deleted here.");
    if (before.role === "ADMIN" && session.role !== "SUPER_ADMIN") throw new Error("Only Super Admin can delete Admin accounts.");

    const blockers: string[] = [];
    if (before._count.orders) blockers.push(`${before._count.orders} order(s)`);
    if (before._count.checkIns) blockers.push(`${before._count.checkIns} check-in(s)`);
    if (before._count.couponRedemptions) blockers.push(`${before._count.couponRedemptions} coupon redemption(s)`);
    if (before.vendorProfile) blockers.push("a vendor profile");
    if (blockers.length) {
      throw new Error(`Can't permanently delete — this teammate has ${blockers.join(", ")} on record. Use "Remove access" to keep those records.`);
    }

    return {
      before: { role: before.role, email: before.email, name: before.name },
      run: async (tx) => {
        // Detach references that would block the delete (preserve the audit history, just null the actor).
        await tx.auditLog.updateMany({ where: { actorId: id }, data: { actorId: null } });
        await tx.waitlist.updateMany({ where: { userId: id }, data: { userId: null } });
        await tx.user.delete({ where: { id } });
        return { result: { id }, after: null };
      },
    };
  });
}

/** Sign a teammate out of every device (bumps tokenVersion) without removing their access. Audited. */
export function revokeStaffSessions(session: Session, id: string) {
  return withAudit(session, { action: "REVOKE_SESSIONS", entity: "User", entityId: id }, async () => {
    const before = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (before && before.role === "SUPER_ADMIN") {
      throw new Error("Cannot modify Super Admin accounts.");
    }
    if (before && before.role === "ADMIN" && session.role !== "SUPER_ADMIN") {
      throw new Error("Only Super Admin can modify Admin accounts.");
    }
    return {
      before: null,
      run: async () => {
        const u = await db.user.update({ where: { id }, data: { tokenVersion: { increment: 1 } } });
        return { result: { id }, after: { tokenVersion: u.tokenVersion } };
      },
    };
  });
}

