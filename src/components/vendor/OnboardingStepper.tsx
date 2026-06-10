import Link from "next/link";
import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = { key: string; label: string; done: boolean; locked: boolean };

export function OnboardingStepper({ steps, current }: { steps: Step[]; current: string }) {
  return (
    <ol className="flex flex-wrap gap-2">
      {steps.map((s, i) => {
        const active = s.key === current;
        const clickable = (s.done || active) && !s.locked;
        const inner = (
          <span
            className={cn(
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-primary bg-primary/10 font-medium text-primary"
                : s.done
                  ? "border-border text-foreground"
                  : "border-border text-muted-foreground",
              s.locked && "opacity-50",
            )}
          >
            <span className="grid size-5 place-items-center rounded-full border text-xs">
              {s.locked ? <Lock className="size-3" /> : s.done ? <Check className="size-3" /> : i + 1}
            </span>
            {s.label}
          </span>
        );
        return <li key={s.key}>{clickable ? <Link href={`/vendor/onboarding?step=${s.key}`}>{inner}</Link> : inner}</li>;
      })}
    </ol>
  );
}
