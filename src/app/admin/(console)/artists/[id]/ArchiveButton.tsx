"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { setArtistArchivedAction } from "../actions";

export function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const toggle = () =>
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("archived", String(!archived));
      const res = await setArtistArchivedAction(fd);
      if (res && !res.ok) toast.error(res.error.message ?? "Could not update.");
      else {
        toast.success(archived ? "Artist restored." : "Artist archived.");
        router.refresh();
      }
    });

  return (
    <Button variant="outline" className={archived ? "" : "text-destructive"} disabled={isPending} onClick={toggle}>
      {isPending ? "…" : archived ? "Restore" : "Archive"}
    </Button>
  );
}
