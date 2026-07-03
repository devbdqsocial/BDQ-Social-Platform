"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Deferred-commit number input. The designer's old pattern parsed + clamped on every keystroke,
 * so clearing a field snapped to a clamped value and typing appended to it ("380" → 10380 → cap).
 * This keeps a local string while you type and commits ONLY on blur/Enter (Escape reverts):
 * mid-edit nothing jumps, nothing clamps, and callers get one commit per edit (one undo entry).
 */
export function NumInput({
  value,
  onCommit,
  clamp,
  allowEmpty = false,
  placeholder,
  step,
  className,
}: {
  value: number | null;
  onCommit: (v: number | null) => void;
  /** applied once at commit time (e.g. Math.max(1, v)) — never while typing */
  clamp?: (v: number) => number;
  /** empty field commits null (clear an override); otherwise empty reverts to the last value */
  allowEmpty?: boolean;
  placeholder?: string;
  step?: number;
  className?: string;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));
  const focused = useRef(false);
  const escaped = useRef(false);

  // external changes (drag, transformer, preset) update the field only while it isn't being edited
  useEffect(() => {
    if (!focused.current) setText(value == null ? "" : String(value));
  }, [value]);

  const commit = () => {
    const raw = text.trim();
    if (raw === "") {
      if (allowEmpty) { onCommit(null); return; }
      setText(value == null ? "" : String(value)); // revert
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) { setText(value == null ? "" : String(value)); return; }
    const v = clamp ? clamp(n) : n;
    setText(String(v));
    onCommit(v);
  };

  return (
    <input
      type="number"
      value={text}
      step={step}
      placeholder={placeholder}
      className={className}
      onFocus={() => { focused.current = true; }}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        focused.current = false;
        if (escaped.current) { escaped.current = false; setText(value == null ? "" : String(value)); return; }
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.currentTarget.blur(); }
        else if (e.key === "Escape") { escaped.current = true; e.currentTarget.blur(); }
      }}
    />
  );
}
