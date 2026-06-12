import { afterEach, describe, expect, it } from "vitest";
import { verifyFirebaseIdToken } from "./firebase-verify";

describe("verifyFirebaseIdToken", () => {
  const prev = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  afterEach(() => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = prev;
  });

  it("rejects when projectId is not configured", async () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    await expect(verifyFirebaseIdToken("a.b.c")).rejects.toThrow();
  });

  it("rejects a malformed token", async () => {
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = "bdq-social";
    await expect(verifyFirebaseIdToken("not-a-jwt")).rejects.toThrow();
  });
});
