import type { Metadata } from "next";
import { CheckCircle2, XCircle } from "lucide-react";
import { requireAdminRole } from "@/server/auth/guard";
import { communicationOverview } from "@/server/settings/communication";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Communication" };

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-2xl font-semibold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ProviderRow({ name, ok, detail }: { name: string; ok: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {ok ? (
        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600"><CheckCircle2 className="size-4" /> Configured</span>
      ) : (
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="size-4" /> Not configured</span>
      )}
    </div>
  );
}

/** Read-only delivery health: providers + outbox queue + recent failures. */
export default async function CommunicationPage() {
  await requireAdminRole();
  const o = await communicationOverview();

  return (
    <div className="space-y-6">
      <PageHeader title="Communication" description="Email & WhatsApp providers and delivery queue health." />

      <Card>
        <CardHeader><CardTitle>Providers</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <ProviderRow name="Email (Resend)" ok={o.email.configured} detail="Transactional email" />
          <ProviderRow name="WhatsApp" ok={o.whatsapp.configured} detail={o.whatsapp.provider ? `Provider: ${o.whatsapp.provider}` : "No provider set"} />
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Queued" value={o.queue.queued} />
        <Stat label="Sent" value={o.queue.sent} />
        <Stat label="Failed" value={o.queue.failed} />
      </div>
      <p className="text-xs text-muted-foreground">
        Last message sent: {o.lastSentAt ? new Date(o.lastSentAt).toLocaleString() : "—"}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Recent failures</CardTitle>
          <CardDescription>Most recent undelivered messages (retried automatically by cron).</CardDescription>
        </CardHeader>
        <CardContent>
          {o.recentFailures.length === 0 ? (
            <p className="text-xs text-muted-foreground">No failed messages. 🎉</p>
          ) : (
            <ul className="grid gap-2 text-xs">
              {o.recentFailures.map((f, i) => (
                <li key={i} className="flex flex-wrap gap-x-3 border-b pb-2 last:border-0">
                  <span className="font-mono">{new Date(f.at).toLocaleString()}</span>
                  <span className="font-medium">{f.channel}</span>
                  <span className="text-muted-foreground">{f.to}</span>
                  <span className="text-muted-foreground">{f.template}</span>
                  <span>×{f.attempts}</span>
                  {f.error && <span className="text-destructive w-full sm:w-auto truncate">{f.error}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
