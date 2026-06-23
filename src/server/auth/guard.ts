/**
 * RBAC primitives. Two gates: middleware (coarse, per zone) + per-action server check (fine).
 * Session resolution is stubbed in P0; Firebase verify + httpOnly session land in slice 2.
 */

import { cache } from "react";

export type Role = "CUSTOMER" | "VENDOR" | "STAFF" | "ADMIN" | "SUPER_ADMIN";
export type Permission =
  | "CHECKIN"
  | "VENDOR_MANAGE"
  | "VENDOR_VIEW"
  | "ARTIST_MANAGE"
  | "ARTIST_VIEW"
  | "EVENT_VIEW"
  | "CUSTOMER_VIEW"
  | "PAYMENT_VIEW"
  | "TICKETS_MANAGE"
  | "FINANCE_MANAGE";

export type Zone = "public" | "customer" | "vendor" | "admin";

export interface Session {
  userId: string;
  role: Role;
  permissions: Permission[];
}

/**
 * Resolve the current session from the signed httpOnly cookie.
 * Request-scoped memoization (React cache): the layout + page guards share ONE read per request,
 * so the privileged tokenVersion DB check runs once per request instead of 2–3×. Still per-request —
 * the next request re-reads, so tokenVersion-based revocation stays instant.
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const { readSession } = await import("./session");
  return readSession();
});

/** Fixed ids of the seeded accounts (see prisma/seed.mjs). */
export const SEED_ADMIN_ID = "admin_seed";
export const SEED_VENDOR_ID = "vendor_seed";

/**
 * Require an admin/staff session for admin mutations.
 * TEMP dev gate: with DEV_ADMIN=true (dev only) returns the seeded SUPER_ADMIN so admin pages work
 * before Firebase admin (email/password + TOTP) is wired. Remove the dev branch in production.
 */
export async function requireAdmin(): Promise<Session> {
  const s = await getSession();
  if (s && (s.role === "SUPER_ADMIN" || s.role === "ADMIN" || s.role === "STAFF")) return s;

  const { env } = await import("@/lib/env");
  if (env.DEV_ADMIN && process.env.NODE_ENV !== "production") {
    return { userId: SEED_ADMIN_ID, role: "SUPER_ADMIN", permissions: [] };
  }
  throw new AuthError("FORBIDDEN");
}

/**
 * Require a vendor session.
 * TEMP dev gate: with DEV_VENDOR=true (dev only) returns the seeded vendor so the vendor portal is
 * usable before Firebase phone login is exercised. Remove the dev branch in production.
 */
export async function requireVendor(): Promise<Session> {
  const s = await getSession();
  if (s && (s.role === "VENDOR" || s.role === "SUPER_ADMIN")) return s;

  const { env } = await import("@/lib/env");
  if (env.DEV_VENDOR && process.env.NODE_ENV !== "production") {
    return { userId: SEED_VENDOR_ID, role: "VENDOR", permissions: [] };
  }
  throw new AuthError("FORBIDDEN");
}

/**
 * Require a console ADMIN-level role: SUPER_ADMIN or ADMIN (staff can never reach these).
 * Renamed from the misleading `requireSuperAdmin` (build-plan R0.4 / security §3.2).
 * Dev gate: DEV_ADMIN → super-admin.
 */
export async function requireAdminRole(): Promise<Session> {
  const s = await getSession();
  if (s && (s.role === "SUPER_ADMIN" || s.role === "ADMIN")) return s;

  const { env } = await import("@/lib/env");
  if (env.DEV_ADMIN && process.env.NODE_ENV !== "production") {
    return { userId: SEED_ADMIN_ID, role: "SUPER_ADMIN", permissions: [] };
  }
  throw new AuthError("FORBIDDEN");
}

/**
 * Require the SUPER_ADMIN role strictly (e.g. system audit logs).
 * Renamed from `requireSuperAdminOnly` (build-plan R0.4) — the name now means what it says.
 */
export async function requireSuperAdmin(): Promise<Session> {
  const s = await getSession();
  if (s && s.role === "SUPER_ADMIN") return s;

  const { env } = await import("@/lib/env");
  if (env.DEV_ADMIN && process.env.NODE_ENV !== "production") {
    return { userId: SEED_ADMIN_ID, role: "SUPER_ADMIN", permissions: [] };
  }
  throw new AuthError("FORBIDDEN");
}

/**
 * Require a specific permission: SUPER_ADMIN always passes; STAFF passes if it holds `need`.
 * Dev gate: DEV_ADMIN → super-admin.
 */
export async function requirePermission(need: Permission): Promise<Session> {
  const s = await getSession();
  if (s && can(s, need)) return s;

  const { env } = await import("@/lib/env");
  if (env.DEV_ADMIN && process.env.NODE_ENV !== "production") {
    return { userId: SEED_ADMIN_ID, role: "SUPER_ADMIN", permissions: [] };
  }
  throw new AuthError("FORBIDDEN");
}

/**
 * Require check-in rights: SUPER_ADMIN, or STAFF with the CHECKIN permission.
 * Dev gate: DEV_ADMIN → super-admin (so the scanner is testable now).
 */
export async function requireCheckin(): Promise<Session> {
  const s = await getSession();
  if (s && (s.role === "SUPER_ADMIN" || (s.role === "STAFF" && s.permissions.includes("CHECKIN")))) {
    return s;
  }
  const { env } = await import("@/lib/env");
  if (env.DEV_ADMIN && process.env.NODE_ENV !== "production") {
    return { userId: SEED_ADMIN_ID, role: "SUPER_ADMIN", permissions: [] };
  }
  throw new AuthError("FORBIDDEN");
}

export class AuthError extends Error {
  constructor(public code: "UNAUTHENTICATED" | "FORBIDDEN") {
    super(code);
    this.name = "AuthError";
  }
}

export function can(session: Session, need: Role | Permission): boolean {
  if (session.role === "SUPER_ADMIN") return true;
  if (need === "SUPER_ADMIN") return false;
  if (session.role === "ADMIN") return true;
  if (need === session.role) return true;
  return session.permissions.includes(need as Permission);
}

/**
 * withAuth — wrap a server action/handler so it runs only for an authorized session.
 * Part of the mutation chain: withAuth -> withValidation -> withAudit (CLAUDE.md).
 */
export function withAuth<TArgs extends unknown[], TOut>(
  need: Role | Permission,
  handler: (session: Session, ...args: TArgs) => Promise<TOut>,
) {
  return async (...args: TArgs): Promise<TOut> => {
    const session = await getSession();
    if (!session) throw new AuthError("UNAUTHENTICATED");
    if (!can(session, need)) throw new AuthError("FORBIDDEN");
    return handler(session, ...args);
  };
}
