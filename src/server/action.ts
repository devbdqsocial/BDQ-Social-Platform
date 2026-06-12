import "server-only";
import type { z } from "zod";
import { getSession, can, AuthError, type Permission, type Role, type Session } from "@/server/auth/guard";
import { withAudit } from "@/server/audit";
import { logError } from "@/lib/logger";
import { err, ok, type Result } from "@/lib/result";

/**
 * action() — the ONE mutation pipeline: auth → zod parse → handler → (optional) audit →
 * Result<T> envelope (Docs/audit/architecture.md §3). Server actions build their raw input
 * from FormData and return the envelope; clients toast on it (components/admin/action-form).
 *
 * `auth` uses can(): "ADMIN" = console roles (SUPER_ADMIN + ADMIN), "SUPER_ADMIN" = strict,
 * a Permission atom = SUPER_ADMIN/ADMIN or STAFF holding it.
 * `audit` is for handlers that do NOT already withAudit inside their service (most services do).
 */

/** Domain error whose message is safe to show the user verbatim. */
export class ActionError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ActionError";
  }
}

/** Next control-flow throws (redirect()/notFound()) must always propagate, never be enveloped. */
const isNextControlFlow = (e: unknown): boolean =>
  typeof e === "object" && e !== null && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_");

export function action<S extends z.ZodType, O>(opts: {
  auth: Role | Permission;
  input: S;
  audit?: { action: string; entity: string };
  handler: (session: Session, input: z.output<S>) => Promise<O>;
}) {
  return async (raw: unknown): Promise<Result<O>> => {
    const session = await getSession();
    if (!session) return err("UNAUTHENTICATED");
    if (!can(session, opts.auth)) return err("FORBIDDEN");

    const parsed = opts.input.safeParse(raw);
    if (!parsed.success) return err("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid input");

    try {
      const run = () => opts.handler(session, parsed.data);
      const data = opts.audit
        ? await withAudit(session, opts.audit, async () => ({
            before: null,
            run: async () => {
              const result = await run();
              return { result, after: (result ?? null) as unknown };
            },
          }))
        : await run();
      return ok(data);
    } catch (e) {
      if (isNextControlFlow(e)) throw e;
      if (e instanceof AuthError) return err(e.code);
      if (e instanceof ActionError) return err(e.code, e.message);
      logError("action", e, { auth: String(opts.auth) });
      return err("INTERNAL", "Something went wrong. Please try again.");
    }
  };
}
