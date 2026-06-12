/**
 * The ONE mutation envelope (Docs/audit/architecture.md §3). Server actions and route handlers
 * both return Result<T>; clients switch on `ok` — never on thrown errors or HTTP shapes.
 */
export type Result<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message?: string } };

export const ok = <T,>(data: T): Result<T> => ({ ok: true, data });
export const err = (code: string, message?: string): Result<never> => ({ ok: false, error: { code, message } });
