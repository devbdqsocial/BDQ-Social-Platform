"use client";

import { useState } from "react";
import { toast } from "sonner";
import { joinStallWaitlistAction } from "@/app/vendor/(app)/events/actions";

export function StallWaitlistJoin({ eventId, ghost = false }: { eventId: string; ghost?: boolean }) {
  const [state, setState] = useState<"idle" | "busy" | "joined">("idle");

  const join = async () => {
    setState("busy");
    try {
      const r = await joinStallWaitlistAction(eventId);
      if (!r.ok) throw new Error(r.error);
      setState("joined");
      toast.success("You're on the waitlist");
    } catch (e) {
      setState("idle");
      toast.error(e instanceof Error && e.message ? e.message : "Could not join the waitlist");
    }
  };

  if (state === "joined") {
    return (
      <p className="f-paragraph-small font-bold" role="status">
        You&apos;re on the list — we&apos;ll message you the moment a stall frees up.
      </p>
    );
  }
  return (
    <button type="button" className={`bdq-btn${ghost ? " bdq-btn--ghost" : ""}`} disabled={state === "busy"} onClick={join}>
      {state === "busy" ? "Joining…" : "Join the waitlist"}
    </button>
  );
}
