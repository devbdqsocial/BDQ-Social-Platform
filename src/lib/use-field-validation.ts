"use client";
import { useCallback, useState } from "react";
import type { z } from "zod";
import { validateForm, validateValue } from "./validators";

/**
 * Thin client wrappers over the pure validators (validateValue/validateForm). All real logic is in
 * validators.ts (node-tested); these just hold error state for live (blur) + submit-time messages.
 *
 * Single field:
 *   const phone = useFieldValidation(phone10);
 *   <input onChange={e => { setV(digitsCapped(10)(e.target.value)); phone.clear(); }}
 *          onBlur={e => phone.validate(e.target.value)} aria-invalid={!!phone.error} />
 *   {phone.error && <span className="error">{phone.error}</span>}
 */
export function useFieldValidation(schema: z.ZodTypeAny) {
  const [error, setError] = useState<string | null>(null);
  const validate = useCallback(
    (value: unknown) => {
      const msg = validateValue(schema, value);
      setError(msg);
      return msg === null;
    },
    [schema],
  );
  const clear = useCallback(() => setError(null), []);
  return { error, validate, clear, setError };
}

/**
 * Whole-form errors keyed by field — for submit-time checks against an object schema.
 *   const f = useFormErrors();
 *   if (!f.check(schema, values)) return; // blocks submit, populates f.errors
 *   <input aria-invalid={!!f.errors.phone} onChange={() => f.clearField("phone")} />
 */
export function useFormErrors() {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const check = useCallback((schema: z.ZodType, values: Record<string, unknown>) => {
    const e = validateForm(schema, values);
    setErrors(e);
    return Object.keys(e).length === 0;
  }, []);
  const clearField = useCallback((key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);
  return { errors, check, clearField, setErrors };
}
