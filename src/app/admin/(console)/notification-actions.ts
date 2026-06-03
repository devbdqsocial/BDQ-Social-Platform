"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guard";
import { markAllRead } from "@/server/notifications/admin";

export async function markAllReadAction(): Promise<void> {
  await requireAdmin();
  await markAllRead();
  revalidatePath("/admin", "layout");
}
