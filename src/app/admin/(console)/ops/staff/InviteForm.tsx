"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { inviteStaffAction } from "./actions";

/**
 * Invite-by-email form. On success it shows the invite link in a copyable box so the invite works
 * even if email isn't delivered — the previous flow gave no way to recover a missed/broken link.
 * Also warns before inviting an address that is already a teammate.
 */
export function InviteForm({ presets, isSuperAdmin, existingEmails }: { presets: { key: string; label: string }[]; isSuperAdmin: boolean; existingEmails: string[] }) {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const existing = useMemo(() => new Set(existingEmails.map((e) => e.toLowerCase())), [existingEmails]);
  const dup = email.trim() !== "" && existing.has(email.trim().toLowerCase());

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    start(async () => {
      const res = await inviteStaffAction(fd);
      if (res.ok) {
        setLink(res.data.url);
        setCopied(false);
        toast.success("Invite ready");
        form.reset();
        setEmail("");
      } else {
        toast.error(res.error.message ?? "Could not send the invite.");
      }
    });
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed — select the link and copy manually.");
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6 rounded-lg border p-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Invite by email (recommended)</h2>
        <p className="text-sm text-muted-foreground">They set their own password and enable 2FA from a secure link — you never handle a password. You can also copy the link and share it directly.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" className="sm:col-span-2">
          <Input name="name" placeholder="Priya from the gate team" />
        </Field>
        <Field label="Email">
          <Input name="email" type="email" required placeholder="priya@bdqsocial.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          {dup && <p className="mt-1 text-xs text-[color-mix(in_oklch,var(--warning),var(--foreground)_25%)]">Already a teammate — inviting again just updates them.</p>}
        </Field>
        <Field label="Role">
          <Select name="preset" required defaultValue="SCANNER_ONLY">
            {isSuperAdmin && <option value="ADMIN">Administrator (Access all but logs)</option>}
            {presets.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </Select>
        </Field>
        <Button type="submit" variant="outline" className="w-fit sm:col-span-2" disabled={pending}>{pending ? "Sending…" : "Send invite"}</Button>
      </div>
      {link && (
        <div className="space-y-1 rounded-md border bg-muted/40 p-3">
          <p className="text-xs font-medium">Invite link (valid 72h)</p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 text-xs">{link}</code>
            <Button type="button" size="sm" variant="outline" onClick={copy}>{copied ? <Check /> : <Copy />}{copied ? "Copied" : "Copy"}</Button>
          </div>
          <p className="text-xs text-muted-foreground">Emailed to them if email is configured; share this link if it doesn&apos;t arrive.</p>
        </div>
      )}
    </form>
  );
}
