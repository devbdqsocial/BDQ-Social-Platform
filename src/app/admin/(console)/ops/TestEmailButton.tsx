"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendTestEmailAction } from "./actions";

/** Sends a real test email through SendGrid and toasts the result (or the exact failure). */
export function TestEmailButton({ defaultTo }: { defaultTo?: string }) {
  const [to, setTo] = useState(defaultTo ?? "");
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("to", to);
      const res = await sendTestEmailAction(fd);
      if (res.ok) toast.success(`Test email sent to ${to || "your inbox"}`);
      else toast.error(res.error.message ?? "Could not send test email.");
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input value={to} onChange={(e) => setTo(e.target.value)} type="email" placeholder="you@bdqsocial.com" className="h-8 max-w-64" />
      <Button type="button" variant="outline" size="sm" disabled={pending} onClick={run}>
        <Send /> {pending ? "Sending…" : "Send test email"}
      </Button>
    </div>
  );
}
