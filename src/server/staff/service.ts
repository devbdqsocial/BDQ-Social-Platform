import "server-only";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import { hashPassword } from "@/lib/password";
import { permissionsForPreset, type StaffPreset } from "@/lib/staff-presets";
import type { Session } from "@/server/auth/guard";

/** SUPER_ADMIN-managed staff accounts (P3.1). Staff sign in via /api/auth/admin (password, optional TOTP). */

export async function listStaff() {
  const rows = await db.user.findMany({
    where: { role: "STAFF" },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, email: true, permissions: true, passwordHash: true, totpEnabled: true, createdAt: true },
  });
  // never leak the hash — expose only whether the account can sign in
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
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
  input: { email: string; name?: string; preset: StaffPreset; password?: string },
) {
  const email = input.email.toLowerCase();
  const permissions = permissionsForPreset(input.preset);

  return withAudit(session, { action: "UPSERT", entity: "User", entityId: email }, async () => {
    const before = await db.user.findUnique({ where: { email }, select: { role: true, permissions: true } });
    if (before && before.role !== "STAFF") throw new StaffEmailTakenError();
    const passwordHash = input.password ? await hashPassword(input.password) : undefined;

    return {
      before,
      run: async () => {
        const user = await db.user.upsert({
          where: { email },
          update: { name: input.name, permissions, ...(passwordHash ? { passwordHash } : {}) },
          create: { email, name: input.name, role: "STAFF", permissions, passwordHash },
        });
        return { result: user, after: { role: user.role, permissions: user.permissions } };
      },
    };
  });
}

/** Revoke access: clears the password + permissions (row kept for audit history). */
export function removeStaffAccess(session: Session, id: string) {
  return withAudit(session, { action: "DISABLE", entity: "User", entityId: id }, async () => {
    const before = await db.user.findUnique({ where: { id }, select: { permissions: true } });
    return {
      before,
      run: async () => {
        const u = await db.user.update({ where: { id }, data: { passwordHash: null, permissions: [] } });
        return { result: u, after: { permissions: [] } };
      },
    };
  });
}
