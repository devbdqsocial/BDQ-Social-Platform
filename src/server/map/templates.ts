import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/server/db";
import { withAudit } from "@/server/audit";
import type { Session } from "@/server/auth/guard";
import { DEFAULT_CANVAS, validateLayout, type CanvasMeta, type EditorElement } from "@/lib/map/designer-ops";
import { saveEventMap } from "@/server/events/service";

/** Reusable layout templates: snapshot an event's canvas + elements + stall types, clone onto another. */

interface TemplateType { id: string; name: string; widthFt: number; heightFt: number; priceInPaise: number; color: string; sellable: boolean }
interface TemplatePayload { version: number; canvas: CanvasMeta; elements: EditorElement[]; stallTypes: TemplateType[] }

export function listTemplates() {
  return db.layoutTemplate.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, name: true, createdAt: true } });
}

export function saveAsTemplate(session: Session, eventId: string, name: string) {
  return withAudit(session, { action: "CREATE", entity: "LayoutTemplate" }, async () => ({
    before: null,
    run: async () => {
      const [ml, types] = await Promise.all([
        db.mapLayout.findUnique({ where: { eventId }, select: { layoutJson: true } }),
        db.stallTypeDef.findMany({ where: { eventId } }),
      ]);
      const base = (ml?.layoutJson as { canvas?: CanvasMeta; elements?: EditorElement[] } | null) ?? null;
      const payload: TemplatePayload = {
        version: 1,
        canvas: base?.canvas ?? DEFAULT_CANVAS,
        elements: base?.elements ?? [],
        stallTypes: types.map((t) => ({ id: t.id, name: t.name, widthFt: t.widthFt, heightFt: t.heightFt, priceInPaise: t.priceInPaise, color: t.color, sellable: t.sellable })),
      };
      const tpl = await db.layoutTemplate.create({
        data: { name, layoutJson: payload as unknown as Prisma.InputJsonValue, createdById: session.userId },
      });
      return { result: tpl, after: { id: tpl.id, name } };
    },
  }));
}

export function applyTemplate(session: Session, eventId: string, templateId: string) {
  return withAudit(session, { action: "UPDATE", entity: "Event", entityId: eventId }, async () => ({
    before: null,
    run: async () => {
      const tpl = await db.layoutTemplate.findUnique({ where: { id: templateId } });
      if (!tpl) throw new Error("Template not found");
      const data = tpl.layoutJson as unknown as TemplatePayload;
      // Clone stall types into the target event (upsert by name) and remap element links.
      const idMap = new Map<string, string>();
      for (const st of data.stallTypes ?? []) {
        const row = await db.stallTypeDef.upsert({
          where: { eventId_name: { eventId, name: st.name } },
          update: { widthFt: st.widthFt, heightFt: st.heightFt, priceInPaise: st.priceInPaise, color: st.color, sellable: st.sellable },
          create: { eventId, name: st.name, widthFt: st.widthFt, heightFt: st.heightFt, priceInPaise: st.priceInPaise, color: st.color, sellable: st.sellable },
        });
        if (st.id) idMap.set(st.id, row.id);
      }
      const elements = (data.elements ?? []).map((el) => ({
        ...el,
        stallTypeId: el.stallTypeId ? idMap.get(el.stallTypeId) : undefined,
      }));
      const res = validateLayout({ version: 1, canvas: data.canvas ?? DEFAULT_CANVAS, elements });
      if (!res.ok) throw new Error(res.error);
      await saveEventMap(session, eventId, res.layout);
      return { result: { eventId }, after: { templateId } };
    },
  }));
}
