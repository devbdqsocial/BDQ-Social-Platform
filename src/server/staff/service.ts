import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
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

