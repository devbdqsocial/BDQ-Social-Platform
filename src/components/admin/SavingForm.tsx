"use client";

import * as React from "react";
import { toast } from "sonner";

/** A form that submits a void server action via a transition, shows a "saved" toast on success,
 * and (with `guard`) warns before the user leaves the page with unsaved edits. Keeps the server
 * action as the single source of truth — no client-side validation duplication. */
export function SavingForm({
  action,
  children,
  className,
  savedMessage = "Saved",
  guard = false,
  ...rest
}: {
  action: (formData: FormData) => Promise<void>;
  children: React.ReactNode;
  className?: string;
  savedMessage?: string;
  /** Track edits and warn on page-exit while unsaved. */
  guard?: boolean;
} & Omit<React.ComponentProps<"form">, "action">) {
  const [pending, start] = React.useTransition();
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    if (!guard || !dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [guard, dirty]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await action(fd);
        setDirty(false);
        toast.success(savedMessage);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Couldn't save — check the form and try again.");
      }
    });
  };

  return (
    <form
      {...rest}
      className={className}
      onSubmit={onSubmit}
      onInput={guard ? () => setDirty(true) : undefined}
      aria-busy={pending}
    >
      {children}
    </form>
  );
}
