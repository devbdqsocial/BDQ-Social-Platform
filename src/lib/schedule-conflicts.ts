/**
 * Stage scheduling conflict detection (pure, DB-free). Two items clash when they share a stage/zone
 * and their time ranges overlap. Used to warn admins on the run-of-show. Half-open overlap so
 * back-to-back sets (one ends exactly when the next starts) do NOT count as a clash.
 */

export interface ConflictSlot {
  id: string;
  label: string;
  stageOrZone: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
}

export interface StageConflict {
  stage: string;
  a: { id: string; label: string };
  b: { id: string; label: string };
}

/** End defaults to start (a point) so an untimed-end item still flags an obvious double-book. */
const range = (s: ConflictSlot): [number, number] | null => {
  if (!s.startsAt) return null;
  const start = s.startsAt.getTime();
  const end = (s.endsAt ?? s.startsAt).getTime();
  return [start, Math.max(start, end)];
};

const overlaps = (x: [number, number], y: [number, number]): boolean => x[0] < y[1] && y[0] < x[1];

export function detectStageConflicts(slots: ConflictSlot[]): StageConflict[] {
  const byStage = new Map<string, ConflictSlot[]>();
  for (const s of slots) {
    if (!s.stageOrZone || !s.startsAt) continue;
    const list = byStage.get(s.stageOrZone) ?? [];
    list.push(s);
    byStage.set(s.stageOrZone, list);
  }

  const conflicts: StageConflict[] = [];
  for (const [stage, items] of byStage) {
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const ra = range(items[i]);
        const rb = range(items[j]);
        if (ra && rb && overlaps(ra, rb)) {
          conflicts.push({ stage, a: { id: items[i].id, label: items[i].label }, b: { id: items[j].id, label: items[j].label } });
        }
      }
    }
  }
  return conflicts;
}
