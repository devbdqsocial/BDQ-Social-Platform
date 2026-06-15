"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publishEventAction } from "@/app/admin/(console)/events/actions";

/** Wizard finish: publish the event then land on its detail page. */
export function PublishButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const publish = () => {
    const fd = new FormData();
    fd.set("id", eventId);
    start(async () => {
      const res = await publishEventAction(fd);
      if (res.ok) {
        toast.success("Event published");
        router.push(`/admin/events/${eventId}`);
      } else {
        toast.error(res.error.message ?? "Couldn't publish — try again.");
      }
    });
  };

  return <Button onClick={publish} disabled={pending}>{pending ? "Publishing…" : "Publish event"}</Button>;
}
