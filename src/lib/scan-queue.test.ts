import { describe, expect, it } from "vitest";
import { addToQueue, removeFromQueue, type QueuedScan } from "./scan-queue";

const item = (id: string): QueuedScan => ({ clientScanId: id, qrToken: "t" });

describe("scan queue", () => {
  it("adds and dedupes by clientScanId", () => {
    let q: QueuedScan[] = [];
    q = addToQueue(q, item("a"));
    q = addToQueue(q, item("b"));
    q = addToQueue(q, item("a")); // dup
    expect(q.map((x) => x.clientScanId)).toEqual(["a", "b"]);
  });

  it("removes by clientScanId", () => {
    const q = [item("a"), item("b")];
    expect(removeFromQueue(q, "a").map((x) => x.clientScanId)).toEqual(["b"]);
  });
});
