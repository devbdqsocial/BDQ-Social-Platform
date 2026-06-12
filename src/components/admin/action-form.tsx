"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { Result } from "@/lib/result";

const FALLBACK: Record<string, string> = {
  UNAUTHENTICATED: "Your session expired — sign in again.",
  FORBIDDEN: "You don't have access for that.",
  VALIDATION: "Check the form and try again.",
};

/**
 * ActionForm — submits a Result-returning server action and toasts the envelope
 * (success copy pattern: "<Entity> <verbed>", design-system §4.6). Replaces plain
 * `<form action={...}>` so failures surface instead of silently no-op'ing.
 */
export function ActionForm({
  action,
  success,
  resetOnSuccess = false,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<Result<unknown>>;
  success?: string;
  resetOnSuccess?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const res = await action(formData);
      if (res.ok) {
        if (success) toast.success(success);
        if (resetOnSuccess) form.reset();
      } else {
        toast.error(res.error.message ?? FALLBACK[res.error.code] ?? "Something went wrong. Please try again.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className={className} aria-busy={pending} data-pending={pending || undefined}>
      {children}
    </form>
  );
}
