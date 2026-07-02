import Link from "next/link";
import { Check, Circle, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ActionForm } from "@/components/admin/action-form";
import { publishEventAction } from "@/app/admin/(console)/events/actions";
import type { EventReadinessIssue } from "@/server/events/service";
import type { SetupStep } from "@/server/events/setup-steps";

type Readiness = { ready: boolean; issues: EventReadinessIssue[]; warnings: EventReadinessIssue[] };

function StepRow({ step }: { step: SetupStep }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <span className="flex items-center gap-2">
        {step.skipped ? (
          <Minus className="size-4 shrink-0 text-muted-foreground" />
        ) : step.done ? (
          <Check className="size-4 shrink-0 text-success" />
        ) : (
          <Circle className="size-4 shrink-0 text-muted-foreground" />
        )}
        <span className={step.done ? "text-muted-foreground" : ""}>{step.label}</span>
      </span>
      {step.href && !step.done && <Link href={step.href} className="shrink-0 text-primary hover:underline">Go →</Link>}
    </li>
  );
}

/** The Overview tab's setup panel — renders `deriveSetupSteps` output grouped into required,
 * optional, and platform config, with `getEventReadiness` as the single source of "ready". */
export function EventSetupChecklist({
  eventId,
  status,
  steps,
  readiness,
}: {
  eventId: string;
  status: string;
  steps: SetupStep[];
  readiness: Readiness;
}) {
  const required = steps.filter((s) => s.group === "required");
  const optional = steps.filter((s) => s.group === "optional");
  const platform = steps.filter((s) => s.group === "platform");
  const requiredDone = [...required, ...platform].filter((s) => s.done).length;
  const requiredTotal = required.length + platform.length;

  if (status !== "DRAFT") {
    const open = optional.filter((s) => !s.done).length;
    return (
      <p className="text-sm text-muted-foreground">
        <Check className="mr-1 inline size-4 text-success" />
        Setup complete — this event is {status === "ARCHIVED" ? "archived" : "public"}.
        {open > 0 && <> {open} optional item{open === 1 ? "" : "s"} still open below.</>}
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Get this event ready</CardTitle>
          <Badge variant={readiness.ready ? "success" : "warning"}>
            {readiness.ready ? "Ready to publish" : `${requiredDone}/${requiredTotal} required done`}
          </Badge>
        </div>
        <CardDescription>Finish the required steps in any order — optional ones make the event page richer.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2 text-sm">
          {required.map((s) => <StepRow key={s.key} step={s} />)}
        </ul>

        {platform.some((s) => !s.done) && (
          <ul className="space-y-2 text-sm">
            {readiness.issues.filter((i) => i.key === "legal" || i.key === "payments").map((issue) => (
              <li key={issue.key} className="rounded-lg border border-border p-3">
                <p className="font-medium">{issue.label} <span className="font-normal text-muted-foreground">(platform-wide)</span></p>
                <p className="mt-1 text-muted-foreground">{issue.detail}</p>
              </li>
            ))}
          </ul>
        )}

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Optional</p>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {optional.map((s) => <StepRow key={s.key} step={s} />)}
          </ul>
        </div>

        {readiness.warnings.length > 0 && (
          <ul className="space-y-2 text-sm">
            {readiness.warnings.map((w) => (
              <li key={w.key} className="rounded-lg border border-warning/40 bg-warning/10 p-3">
                <p className="font-medium">⚠ {w.label}</p>
                <p className="mt-1 text-muted-foreground">{w.detail} <span className="italic">Advisory — won&apos;t block publishing.</span></p>
              </li>
            ))}
          </ul>
        )}

        {readiness.ready && (
          <ActionForm action={publishEventAction} success="Event published">
            <input type="hidden" name="id" value={eventId} />
            <Button type="submit" className="w-fit">Publish event</Button>
          </ActionForm>
        )}
      </CardContent>
    </Card>
  );
}
