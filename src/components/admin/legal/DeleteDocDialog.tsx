"use client";

import * as React from "react";
import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { deleteLegalDocAction } from "@/app/admin/(console)/legal/actions";

export type DeletableDoc = { id: string; title: string; wellKnown: boolean; assignments: number };

/** Permanent-delete confirm. Core (well-known) docs require typing the exact title. */
export function DeleteDocDialog({ doc, redirectAfter, trigger }: { doc: DeletableDoc; redirectAfter?: boolean; trigger: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [pending, startTransition] = useTransition();
  const confirmed = !doc.wellKnown || typed.trim() === doc.title;

  const run = () =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", doc.id);
      if (redirectAfter) fd.set("redirect", "1");
      const res = await deleteLegalDocAction(fd);
      if (res.ok) {
        toast.success("Document deleted");
        setOpen(false);
      } else {
        toast.error(res.error.message ?? "Couldn't delete — try again.");
      }
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTyped("");
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{doc.title}&rdquo;?</DialogTitle>
          <DialogDescription>
            This permanently deletes the document
            {doc.assignments > 0 ? ` and removes ${doc.assignments} event assignment${doc.assignments === 1 ? "" : "s"}` : ""}.{" "}
            {doc.wellKnown
              ? "This is a core document — its page falls back to the built-in text until it is recreated (reseeding restores it)."
              : "Every place it was shown stops listing it."}{" "}
            Already-signed contracts keep their signed copy.
          </DialogDescription>
        </DialogHeader>
        {doc.wellKnown && (
          <div className="space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-medium text-foreground">{doc.title}</span> to confirm.
            </p>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={doc.title} autoComplete="off" />
          </div>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" size="sm" disabled={pending || !confirmed} onClick={run}>
            Delete permanently
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
