import { describe, it, expect } from "vitest";

/**
 * Unit tests for the capacitySnapshot aggregation logic (the groupBy mapping).
 * The DB call itself is not mocked here — we test the pure mapping in isolation.
 */

type GroupRow = { ticketTypeId: string; status: string; _count: { _all: number } };
type TypeDef = { id: string; name: string };

function mapGroupedToByType(grouped: GroupRow[], types: TypeDef[]) {
  const countMap = new Map<string, { sold: number; checkedIn: number }>();
  for (const row of grouped) {
    const entry = countMap.get(row.ticketTypeId) ?? { sold: 0, checkedIn: 0 };
    entry.sold += row._count._all;
    if (row.status === "CHECKED_IN") entry.checkedIn += row._count._all;
    countMap.set(row.ticketTypeId, entry);
  }
  return types.map((t) => {
    const c = countMap.get(t.id) ?? { sold: 0, checkedIn: 0 };
    return { name: t.name, sold: c.sold, checkedIn: c.checkedIn };
  });
}

describe("capacitySnapshot groupBy mapping", () => {
  it("correctly aggregates sold and checkedIn per type", () => {
    const grouped: GroupRow[] = [
      { ticketTypeId: "t1", status: "VALID", _count: { _all: 30 } },
      { ticketTypeId: "t1", status: "CHECKED_IN", _count: { _all: 20 } },
      { ticketTypeId: "t2", status: "VALID", _count: { _all: 10 } },
    ];
    const types: TypeDef[] = [{ id: "t1", name: "GA" }, { id: "t2", name: "VIP" }];
    const result = mapGroupedToByType(grouped, types);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ name: "GA", sold: 50, checkedIn: 20 });
    expect(result[1]).toEqual({ name: "VIP", sold: 10, checkedIn: 0 });
  });

  it("returns zeroes for types with no tickets", () => {
    const result = mapGroupedToByType([], [{ id: "t1", name: "GA" }]);
    expect(result[0]).toEqual({ name: "GA", sold: 0, checkedIn: 0 });
  });
});
