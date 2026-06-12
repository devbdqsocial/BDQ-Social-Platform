import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  withAudit: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("@/server/auth/guard", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/server/auth/guard")>();
  return { ...real, getSession: mocks.getSession };
});
vi.mock("@/server/audit", () => ({ withAudit: mocks.withAudit }));
vi.mock("@/lib/logger", () => ({ logError: mocks.logError }));

import { action, ActionError } from "./action";
import { AuthError } from "@/server/auth/guard";

const admin = { userId: "u1", role: "SUPER_ADMIN", permissions: [] };
const staff = { userId: "u2", role: "STAFF", permissions: ["CHECKIN"] };
const schema = z.object({ name: z.string().min(2, "Name too short") });

type Handler = (session: unknown, input: { name: string }) => Promise<string>;
const make = (handler: Handler = async () => "done", audit?: { action: string; entity: string }) =>
  action({ auth: "ADMIN", input: schema, audit, handler: handler as never });

beforeEach(() => vi.clearAllMocks());

describe("action()", () => {
  it("rejects missing session as UNAUTHENTICATED", async () => {
    mocks.getSession.mockResolvedValue(null);
    expect(await make()({ name: "ok" })).toEqual({ ok: false, error: { code: "UNAUTHENTICATED", message: undefined } });
  });

  it("rejects insufficient role/permission as FORBIDDEN", async () => {
    mocks.getSession.mockResolvedValue(staff);
    expect(await make()({ name: "ok" })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("rejects invalid input with the first zod message", async () => {
    mocks.getSession.mockResolvedValue(admin);
    expect(await make()({ name: "x" })).toEqual({ ok: false, error: { code: "VALIDATION", message: "Name too short" } });
  });

  it("returns ok(data) and passes session + parsed input to the handler", async () => {
    mocks.getSession.mockResolvedValue(admin);
    const handler = vi.fn(async (_s: unknown, input: { name: string }) => `hi ${input.name}`);
    expect(await make(handler)({ name: "bdq" })).toEqual({ ok: true, data: "hi bdq" });
    expect(handler).toHaveBeenCalledWith(admin, { name: "bdq" });
  });

  it("maps ActionError to its code + user-facing message", async () => {
    mocks.getSession.mockResolvedValue(admin);
    const handler = vi.fn(async () => { throw new ActionError("CODE_TAKEN", "That code already exists."); });
    expect(await make(handler)({ name: "bdq" })).toEqual({ ok: false, error: { code: "CODE_TAKEN", message: "That code already exists." } });
  });

  it("maps AuthError thrown inside the handler", async () => {
    mocks.getSession.mockResolvedValue(admin);
    const handler = vi.fn(async () => { throw new AuthError("FORBIDDEN"); });
    expect(await make(handler)({ name: "bdq" })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });

  it("masks unexpected errors as INTERNAL and logs them", async () => {
    mocks.getSession.mockResolvedValue(admin);
    const handler = vi.fn(async () => { throw new Error("db exploded: secret detail"); });
    const res = await make(handler)({ name: "bdq" });
    expect(res).toMatchObject({ ok: false, error: { code: "INTERNAL" } });
    expect(res.ok === false && res.error.message).not.toContain("secret");
    expect(mocks.logError).toHaveBeenCalled();
  });

  it("rethrows Next control-flow errors (redirect/notFound) untouched", async () => {
    mocks.getSession.mockResolvedValue(admin);
    const redirectErr = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;push;/x;307;" });
    const handler = vi.fn(async () => { throw redirectErr; });
    await expect(make(handler)({ name: "bdq" })).rejects.toBe(redirectErr);
  });

  it("routes through withAudit when audit meta is given", async () => {
    mocks.getSession.mockResolvedValue(admin);
    mocks.withAudit.mockImplementation(async (_s: unknown, _m: unknown, capture: () => Promise<{ before: unknown; run: () => Promise<{ result: unknown }> }>) => {
      const { run } = await capture();
      return (await run()).result;
    });
    const res = await make(undefined, { action: "test.create", entity: "Thing" })({ name: "bdq" });
    expect(res).toEqual({ ok: true, data: "done" });
    expect(mocks.withAudit).toHaveBeenCalledWith(admin, { action: "test.create", entity: "Thing" }, expect.any(Function));
  });
});
