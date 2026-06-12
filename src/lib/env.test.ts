import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Tests for the production env validation logic (isolated from the actual schema to avoid
 * importing server-only code; tests the superRefine rules directly).
 */

const makeSchema = () =>
  z
    .object({
      NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
      SESSION_SECRET: z.string().optional(),
      CRON_SECRET: z.string().optional(),
      RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
      DATABASE_URL: z.string().optional(),
      DEV_ADMIN: z.string().optional().transform((s) => s === "true"),
      DEV_VENDOR: z.string().optional().transform((s) => s === "true"),
      ADMIN_NO_2FA_EMAILS: z.string().optional(),
    })
    .superRefine((v, ctx) => {
      if (v.NODE_ENV !== "production") return;
      const required: Array<[string, string]> = [
        ["SESSION_SECRET", "SESSION_SECRET must be set in production"],
        ["CRON_SECRET", "CRON_SECRET must be set in production"],
        ["RAZORPAY_WEBHOOK_SECRET", "RAZORPAY_WEBHOOK_SECRET must be set in production"],
        ["DATABASE_URL", "DATABASE_URL must be set in production"],
      ];
      for (const [key, msg] of required) {
        if (!v[key as keyof typeof v]) ctx.addIssue({ code: "custom", path: [key], message: msg });
      }
      // Dev-bypass flags are inert in prod (call sites gate on NODE_ENV) — warn, never crash.
      if (v.DEV_ADMIN) console.error("[env] DEV_ADMIN is set in production (ignored at runtime; remove it).");
      if (v.DEV_VENDOR) console.error("[env] DEV_VENDOR is set in production (ignored at runtime; remove it).");
      if ((v.ADMIN_NO_2FA_EMAILS ?? "").trim())
        console.error("[env] ADMIN_NO_2FA_EMAILS is non-empty in production (ignored at runtime; clear it).");
      if (v.SESSION_SECRET && v.SESSION_SECRET.length < 32) {
        ctx.addIssue({ code: "custom", path: ["SESSION_SECRET"], message: "SESSION_SECRET must be at least 32 characters" });
      }
    });

describe("env production validation", () => {
  it("passes in development with no secrets", () => {
    expect(() => makeSchema().parse({ NODE_ENV: "development" })).not.toThrow();
  });

  it("fails in production without SESSION_SECRET", () => {
    expect(() =>
      makeSchema().parse({
        NODE_ENV: "production",
        CRON_SECRET: "a".repeat(32),
        RAZORPAY_WEBHOOK_SECRET: "x",
        DATABASE_URL: "postgresql://x",
      }),
    ).toThrow(/SESSION_SECRET must be set/);
  });

  it("fails in production with short SESSION_SECRET", () => {
    expect(() =>
      makeSchema().parse({
        NODE_ENV: "production",
        SESSION_SECRET: "short",
        CRON_SECRET: "a".repeat(32),
        RAZORPAY_WEBHOOK_SECRET: "x",
        DATABASE_URL: "postgresql://x",
      }),
    ).toThrow(/at least 32 characters/);
  });

  it("passes in production with all required secrets", () => {
    expect(() =>
      makeSchema().parse({
        NODE_ENV: "production",
        SESSION_SECRET: "a".repeat(32),
        CRON_SECRET: "b".repeat(32),
        RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
        DATABASE_URL: "postgresql://host/db",
      }),
    ).not.toThrow();
  });

  const prodBase = {
    NODE_ENV: "production" as const,
    SESSION_SECRET: "a".repeat(32),
    CRON_SECRET: "b".repeat(32),
    RAZORPAY_WEBHOOK_SECRET: "webhook-secret",
    DATABASE_URL: "postgresql://host/db",
  };

  it("does not crash in production when DEV_ADMIN is set (inert; warns only)", () => {
    expect(() => makeSchema().parse({ ...prodBase, DEV_ADMIN: "true" })).not.toThrow();
  });

  it("does not crash in production when DEV_VENDOR is set (inert; warns only)", () => {
    expect(() => makeSchema().parse({ ...prodBase, DEV_VENDOR: "true" })).not.toThrow();
  });

  it("does not crash in production when ADMIN_NO_2FA_EMAILS is non-empty (inert; warns only)", () => {
    expect(() => makeSchema().parse({ ...prodBase, ADMIN_NO_2FA_EMAILS: "a@b.com" })).not.toThrow();
  });
});
