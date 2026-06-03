import { useCallback, useState } from "react";

interface HistoryState<T> {
  stack: T[];
  index: number;
}

const MAX = 100;

/** Minimal undo/redo: a present value plus past/future snapshots. */
export function useHistory<T>(initial: T) {
  const [h, setH] = useState<HistoryState<T>>({ stack: [initial], index: 0 });

  const commit = useCallback((next: T) => {
    setH((cur) => {
      const trimmed = cur.stack.slice(0, cur.index + 1);
      const stack = [...trimmed, next];
      const overflow = Math.max(0, stack.length - MAX);
      return { stack: stack.slice(overflow), index: stack.length - overflow - 1 };
    });
  }, []);

  const reset = useCallback((next: T) => setH({ stack: [next], index: 0 }), []);
  const undo = useCallback(() => setH((cur) => ({ ...cur, index: Math.max(0, cur.index - 1) })), []);
  const redo = useCallback(() => setH((cur) => ({ ...cur, index: Math.min(cur.stack.length - 1, cur.index + 1) })), []);

  return {
    present: h.stack[h.index],
    commit,
    reset,
    undo,
    redo,
    canUndo: h.index > 0,
    canRedo: h.index < h.stack.length - 1,
  };
}
