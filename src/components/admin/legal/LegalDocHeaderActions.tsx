"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Rocket, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { DeleteDocDialog, type DeletableDoc } from "./DeleteDocDialog";
import { setDocStatusAction } from "@/app/admin/(console)/legal/actions";
import type { LegalDocStatus } from "@prisma/client";

/** Editor-page lifecycle actions: preview, publish/unpublish, archive/restore, delete (redirects). */
export function LegalDocHeaderActions({ doc }: { doc: DeletableDoc & { slug: string; status: LegalDocStatus } }) {
  const [pending, startTransition] = useTransition();

  const setStatus = (status: LegalDocStatus, ok: string) =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", doc.id);
      fd.set("status", status);
      const res = await setDocStatusAction(fd);
      if (res.ok) toast.success(ok);
      else toast.error(res.error.message ?? "Couldn't update — try again.");
    });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild size="sm" variant="outline">
        <Link href={`/admin/legal/${doc.slug}/preview`}><Eye className="size-4" /> Preview</Link>
      </Button>
      {doc.status === "DRAFT" && (
        <Button size="sm" disabled={pending} onClick={() => setStatus("PUBLISHED", "Published — it's live now")}>
          <Rocket className="size-4" /> Publish
        </Button>
      )}
      {doc.status === "PUBLISHED" && (
        <ConfirmButton
          title="Unpublish this document?"
          description="Its page stops showing this content until you publish again."
          confirmLabel="Unpublish"
          confirmVariant="default"
          onConfirm={() => setStatus("DRAFT", "Unpublished — back to draft")}
          pending={pending}
          trigger={<Button size="sm" variant="outline" disabled={pending}><EyeOff className="size-4" /> Unpublish</Button>}
        />
      )}
      {doc.status === "ARCHIVED" ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => setStatus("DRAFT", "Restored as draft")}>
          <ArchiveRestore className="size-4" /> Restore
        </Button>
      ) : (
        <ConfirmButton
          title="Archive this document?"
          description="It's unpublished and tucked away in the library. You can restore it anytime."
          confirmLabel="Archive"
          confirmVariant="default"
          onConfirm={() => setStatus("ARCHIVED", "Archived")}
          pending={pending}
          trigger={<Button size="sm" variant="ghost" disabled={pending}><Archive className="size-4" /> Archive</Button>}
        />
      )}
      <DeleteDocDialog
        doc={doc}
        redirectAfter
        trigger={
          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="size-4" /> Delete
          </Button>
        }
      />
    </div>
  );
}
