"use client";

import { useState } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

/** Hex-colour input with a live swatch preview. Invalid/partial hex just doesn't paint the
 * swatch (CSS ignores an invalid background-color) — no extra regex needed for a preview. */
export function ThemeColorField({
  name,
  label,
  hint,
  defaultValue,
  placeholder,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue?: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? "");

  return (
    <Field label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <span
          aria-hidden="true"
          className="size-8 shrink-0 rounded-md border border-input"
          style={{ backgroundColor: value || undefined }}
        />
        <Input name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} />
      </div>
    </Field>
  );
}
