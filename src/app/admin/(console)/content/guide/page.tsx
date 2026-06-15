import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminRole } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { getSystemSetting } from "@/server/campaigns/service";
import { parseGuideSections, guideBodiesFromSections, GUIDE_HEADINGS } from "@/lib/content-gate";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveGuideAction } from "./actions";

export const metadata: Metadata = { title: "Guide editor" };

export default async function AdminGuidePage() {
  await requireAdminRole();
  const { active } = await getActiveEvent();
  if (!active) {
    return (
      <div className="space-y-4">
        <PageHeader title="Guide editor" description="Pick or create an event to edit its guide." />
        <p className="text-sm text-muted-foreground">No active event. Choose one from the event switcher.</p>
      </div>
    );
  }

  const bodies = guideBodiesFromSections(parseGuideSections(await getSystemSetting(`guide:${active.id}`)));

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title="Guide editor"
        description={`The festival guide for ${active.name}. Getting-there and timings are added automatically — fill in the rest.`}
        actions={<Button asChild variant="outline" size="sm"><Link href="/guide" target="_blank">View live</Link></Button>}
      />

      <form action={saveGuideAction} className="space-y-4">
        {GUIDE_HEADINGS.map((heading, i) => (
          <Card key={heading}>
            <CardHeader><CardTitle className="text-base">{heading}</CardTitle></CardHeader>
            <CardContent>
              <Textarea name={`s_${i}`} rows={4} defaultValue={bodies[i]} placeholder="One point per line. Leave blank to hide this section." />
            </CardContent>
          </Card>
        ))}
        <Button type="submit">Save guide</Button>
        <p className="text-xs text-muted-foreground">Each non-empty line becomes a point in the section. Empty sections are hidden from guests.</p>
      </form>
    </div>
  );
}
