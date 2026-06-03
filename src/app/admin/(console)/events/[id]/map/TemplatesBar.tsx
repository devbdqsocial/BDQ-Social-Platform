"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { saveTemplateAction, applyTemplateAction } from "./actions";

interface TemplateRow { id: string; name: string }

export function TemplatesBar({ eventId, templates }: { eventId: string; templates: TemplateRow[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const cls = "h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground";

  const save = async () => {
    if (name.trim().length < 2) { setMsg("Name the template (2+ chars)."); return; }
    setBusy(true); setMsg(null);
    try { await saveTemplateAction(eventId, name.trim()); setName(""); setMsg("Saved as template."); router.refresh(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Save failed"); }
    finally { setBusy(false); }
  };

  const apply = async () => {
    if (!templateId) return;
    if (!confirm("Replace this event's current layout with the selected template?")) return;
    setBusy(true); setMsg(null);
    try { await applyTemplateAction(eventId, templateId); window.location.reload(); }
    catch (e) { setMsg(e instanceof Error ? e.message : "Apply failed"); setBusy(false); }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Layout templates</CardTitle>
        <CardDescription>Save this layout to reuse on other events, or load a saved one here.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" className={`${cls} w-44`} />
          <Button type="button" variant="outline" size="sm" disabled={busy} onClick={save}>Save as template</Button>
        </div>
        {templates.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={`${cls} w-44`}>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <Button type="button" size="sm" disabled={busy} onClick={apply}>Use template</Button>
          </div>
        )}
        {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
      </CardContent>
    </Card>
  );
}
