"use client";

import { useEffect } from "react";
import { logError } from "@/lib/logger";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError("app", error, { digest: error.digest });
  }, [error]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-muted-foreground">A hiccup on our end. Please try again.</p>
      <button
        onClick={reset}
        className="mt-6 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </main>
  );
}
