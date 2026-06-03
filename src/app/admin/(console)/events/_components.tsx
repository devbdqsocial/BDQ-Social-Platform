import Link from "next/link";
import { Button } from "@/components/ui/button";

export function EventsNav({ active }: { active: "all" | "past" }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant={active === "all" ? "secondary" : "ghost"} size="sm">
        <Link href="/admin/events">All events</Link>
      </Button>
      <Button asChild variant={active === "past" ? "secondary" : "ghost"} size="sm">
        <Link href="/admin/events/past">Past events</Link>
      </Button>
      <Button asChild size="sm" className="ml-auto">
        <Link href="/admin/events/new">Create event</Link>
      </Button>
    </div>
  );
}
