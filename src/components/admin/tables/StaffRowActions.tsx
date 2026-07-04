"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Eye, Pencil, Send, KeyRound, LogOut, Trash2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { PERMISSIONS } from "@/lib/permissions";
import type { Role } from "@/server/auth/guard";
import type { Result } from "@/lib/result";
import {
  editStaffAccessAction, resendInviteAction, sendResetLinkAction, removeStaffAction, deleteStaffAction, signOutEverywhereAction,
} from "@/app/admin/(console)/ops/staff/actions";

export interface RowUser {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  permissions: string[];
  active: boolean;
}

type LinkAction = (fd: FormData) => Promise<Result<{ url: string }>>;
type VoidAction = (fd: FormData) => Promise<Result<null>>;

/** Runs a Result<{url}> action, copies the returned link to the clipboard, and toasts. */
function LinkActionButton({ id, action, icon: Icon, title, success }: { id: string; action: LinkAction; icon: LucideIcon; title: string; success: string }) {
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const res = await action(fd);
      if (!res.ok) return void toast.error(res.error.message ?? "Could not complete.");
      const url = res.data.url;
      try {
        await navigator.clipboard.writeText(url);
        toast.success(`${success} — link copied`, { description: url });
      } catch {
        toast.success(success, { description: url });
      }
    });
  return (
    <Button type="button" variant="ghost" size="icon-sm" title={title} aria-label={title} disabled={pending} onClick={run}>
      <Icon />
    </Button>
  );
}

/** Runs a Result<null> action and toasts. */
function SimpleActionButton({ id, action, icon: Icon, title, success }: { id: string; action: VoidAction; icon: LucideIcon; title: string; success: string }) {
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const res = await action(fd);
      if (res.ok) toast.success(success);
      else toast.error(res.error.message ?? "Could not complete.");
    });
  return (
    <Button type="button" variant="ghost" size="icon-sm" title={title} aria-label={title} disabled={pending} onClick={run}>
      <Icon />
    </Button>
  );
}

/** Delete a teammate: permanent hard-delete, with an optional revoke-only path for active accounts. */
function DeleteTeammateDialog({ user }: { user: RowUser }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const runDelete = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", user.id);
      const res = await deleteStaffAction(fd);
      if (res.ok) {
        toast.success("Teammate deleted");
        setOpen(false);
      } else toast.error(res.error.message ?? "Could not delete.");
    });

  const runRevoke = () =>
    start(async () => {
      const fd = new FormData();
      fd.set("id", user.id);
      const res = await removeStaffAction(fd);
      if (res.ok) {
        toast.success("Access removed");
        setOpen(false);
      } else toast.error(res.error.message ?? "Could not update.");
    });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" title="Delete teammate" aria-label="Delete teammate" className="text-destructive hover:text-destructive">
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete {user.name ?? user.email}?</DialogTitle>
          <DialogDescription>
            This permanently removes the teammate from the team and can&apos;t be undone. If they have gate check-ins or orders on record, deletion is blocked to protect those — revoke access instead.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
          {user.active && <Button type="button" variant="outline" disabled={pending} onClick={runRevoke}>Just revoke access</Button>}
          <Button type="button" variant="destructive" disabled={pending} onClick={runDelete}>Delete permanently</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Edit a teammate's role (SUPER_ADMIN only) + exact permissions. */
function EditAccessDialog({ user, currentUserRole }: { user: RowUser; currentUserRole: Role }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const isSuper = currentUserRole === "SUPER_ADMIN";

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await editStaffAccessAction(fd);
      if (res.ok) {
        toast.success("Access updated");
        setOpen(false);
      } else toast.error(res.error.message ?? "Could not update access.");
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" title="Edit access" aria-label="Edit access"><Pencil /></Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit access</DialogTitle>
          <DialogDescription>{user.name ?? user.email}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <input type="hidden" name="id" value={user.id} />
          {isSuper && (
            <Field label="Role">
              <Select name="role" defaultValue={user.role === "ADMIN" ? "ADMIN" : "STAFF"}>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin (all permissions)</option>
              </Select>
            </Field>
          )}
          <fieldset className="grid gap-2 sm:grid-cols-2">
            {PERMISSIONS.map((p) => (
              <label key={p.key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="perm" value={p.key} defaultChecked={user.permissions.includes(p.key)} className="size-4" />
                {p.label}
              </label>
            ))}
          </fieldset>
          <p className="text-xs text-muted-foreground">Admins hold all permissions regardless of these boxes. Saving signs the teammate out of active sessions.</p>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save access"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Inline per-teammate actions (icons, not a dropdown). Available for pending AND active rows;
 * respects the privilege boundary — a non-SUPER_ADMIN gets no mutating icons on ADMIN/SUPER_ADMIN rows.
 */
export function StaffRowActions({ user, currentUserRole, showDetails = true }: { user: RowUser; currentUserRole: Role; showDetails?: boolean }) {
  const isPrivileged = user.role === "ADMIN" || user.role === "SUPER_ADMIN";
  const canManage = user.role !== "SUPER_ADMIN" && (currentUserRole === "SUPER_ADMIN" || !isPrivileged);

  return (
    <div className="flex items-center justify-end gap-0.5">
      {showDetails && (
        <Button asChild variant="ghost" size="icon-sm" title="View details" aria-label="View details">
          <Link href={`/admin/ops/staff/${user.id}`}><Eye /></Link>
        </Button>
      )}
      {canManage && <EditAccessDialog user={user} currentUserRole={currentUserRole} />}
      {canManage && !user.active && (
        <LinkActionButton id={user.id} action={resendInviteAction} icon={Send} title="Resend / copy invite link" success="Invite re-sent" />
      )}
      {canManage && user.active && (
        <LinkActionButton id={user.id} action={sendResetLinkAction} icon={KeyRound} title="Send / copy password reset link" success="Reset link sent" />
      )}
      {canManage && user.active && (
        <SimpleActionButton id={user.id} action={signOutEverywhereAction} icon={LogOut} title="Sign out everywhere" success="Signed out everywhere" />
      )}
      {canManage && <DeleteTeammateDialog user={user} />}
    </div>
  );
}
