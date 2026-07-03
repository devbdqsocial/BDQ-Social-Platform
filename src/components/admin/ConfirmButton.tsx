"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

/** Wraps any trigger element in a confirm dialog before running `onConfirm`. Use for one-click
 * destructive/consequential actions that shouldn't fire straight from the list. */
export function ConfirmButton({
  trigger,
  title,
  description,
  confirmLabel = "Confirm",
  confirmVariant = "destructive",
  onConfirm,
  pending,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  confirmVariant?: React.ComponentProps<typeof Button>["variant"];
  onConfirm: () => void;
  pending?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild><Button variant="outline" size="sm">Cancel</Button></DialogClose>
          <Button
            variant={confirmVariant}
            size="sm"
            disabled={pending}
            onClick={() => { onConfirm(); setOpen(false); }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
