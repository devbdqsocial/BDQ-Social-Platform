"use client";

import { useState } from "react";

/** Sold-out "notify me" capture → POST /api/waitlist. */
export function NotifyMe({ eventId }: { eventId: string }) {
  const [contact, setContact] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!contact.trim()) return;
    setState("busy");
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ eventId, type: "TICKET", contact: contact.trim() }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return <p className="f-paragraph-small f-bold">You&apos;re on the list — we&apos;ll email you the moment tickets open.</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-[var(--space-lg)]">
      <input
        type="email"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="you@email.com"
        required
        aria-label="Email address"
        className="f-paragraph min-w-[16rem] flex-1 bg-transparent pb-[var(--space-sm)] outline-none placeholder:opacity-50"
        style={{ borderBottom: "1px solid var(--color)", color: "var(--color)" }}
      />
      <button type="submit" className="btn" data-cursor disabled={state === "busy"}>
        <span className="btn__text">{state === "busy" ? "Adding…" : "Notify me"}</span>
      </button>
      {state === "error" && (
        <p role="alert" className="f-paragraph-small f-bold w-full" style={{ color: "var(--red)" }}>
          Something went wrong — try again.
        </p>
      )}
    </form>
  );
}
