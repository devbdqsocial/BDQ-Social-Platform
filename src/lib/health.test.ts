import { describe, it, expect } from "vitest";
import { healthStatus } from "./health";

describe("healthStatus", () => {
  it("is ok + not degraded when DB is up and the backlog is small", () => {
    expect(healthStatus({ dbOk: true, outboxFailed: 0 })).toEqual({ ok: true, degraded: false });
  });

  it("is degraded (but ok) when the outbox backlog exceeds the threshold", () => {
    expect(healthStatus({ dbOk: true, outboxFailed: 25 })).toEqual({ ok: true, degraded: true });
    expect(healthStatus({ dbOk: true, outboxFailed: 5, threshold: 3 })).toEqual({ ok: true, degraded: true });
  });

  it("is not ok and degraded when the DB is down", () => {
    expect(healthStatus({ dbOk: false, outboxFailed: 0 })).toEqual({ ok: false, degraded: true });
  });
});
