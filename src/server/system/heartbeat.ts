import "server-only";
import { db } from "@/server/db";

/** Lightweight liveness heartbeats stored in SystemSetting (key → ISO timestamp). Read by the
 *  command center alert row (admin-portal §2): "last cron tick" and "webhook last-received". */

export const HEARTBEAT = { cron: "heartbeat:cron", webhook: "heartbeat:webhook" } as const;

export async function recordHeartbeat(key: string): Promise<void> {
  const value = new Date().toISOString();
  try {
    await db.systemSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
  } catch {
    // A heartbeat must never break the path it instruments (cron run / webhook handling).
  }
}

export async function getHeartbeat(key: string): Promise<Date | null> {
  const row = await db.systemSetting.findUnique({ where: { key } });
  const t = row ? new Date(row.value) : null;
  return t && !Number.isNaN(t.getTime()) ? t : null;
}
