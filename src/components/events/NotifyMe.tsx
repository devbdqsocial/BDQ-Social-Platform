"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

  if (state === "done") return <p className="text-sm font-medium text-success">You&apos;re on the list — we&apos;ll email you the moment tickets open.</p>;

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2">
      <Input
        type="email"
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="you@email.com"
        required
        className="min-w-48 flex-1"
      />
      <Button type="submit" disabled={state === "busy"}>{state === "busy" ? "Adding…" : "Notify me"}</Button>
      {state === "error" && <p className="w-full text-sm text-destructive">Something went wrong — try again.</p>}
    </form>
  );
}
