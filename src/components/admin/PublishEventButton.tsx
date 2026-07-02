import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/admin/action-form";
import { publishEventAction } from "@/app/admin/(console)/events/actions";
import type { EventReadinessIssue } from "@/server/events/service";

/** The one publish control — readiness-aware (disabled with the blocking issues as tooltip).
 * Used by the editor header and the Overview setup panel. */
export function PublishEventButton({
  eventId,
  ready,
  issues,
  label = "Publish",
}: {
  eventId: string;
  ready: boolean;
  issues: EventReadinessIssue[];
  label?: string;
}) {
  return (
    <ActionForm action={publishEventAction} success="Event published">
      <input type="hidden" name="id" value={eventId} />
      <Button type="submit" size="sm" disabled={!ready} title={ready ? undefined : `Fix first: ${issues.map((i) => i.label).join(" · ")}`}>
        {label}
      </Button>
    </ActionForm>
  );
}
