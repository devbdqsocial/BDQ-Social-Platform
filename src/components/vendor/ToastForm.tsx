"use client";

import { useState } from "react";
import { toast } from "sonner";

/** Form wrapper for void server actions: success/error toast + disabled fields while pending. */
export function ToastForm({
  action,
  success,
  resetOnSuccess = false,
  className,
  children,
}: {
  action: (fd: FormData) => Promise<void>;
  success: string;
  resetOnSuccess?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    try {
      await action(fd);
      toast.success(success);
      if (resetOnSuccess) form.reset();
    } catch (err) {
      toast.error(err instanceof Error && err.message ? err.message : "Something went wrong — try again");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={className} onSubmit={submit}>
      <fieldset disabled={busy} className="contents">
        {children}
      </fieldset>
    </form>
  );
}
