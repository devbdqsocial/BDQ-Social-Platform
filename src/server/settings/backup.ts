import "server-only";
import { db } from "@/server/db";

/** Read-only backup/export helpers. DB size is a cheap pg metadata read. */
export async function getDbSize(): Promise<string> {
  try {
    const rows = await db.$queryRaw<{ size: string }[]>`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`;
    return rows[0]?.size ?? "—";
  } catch {
    return "—";
  }
}
