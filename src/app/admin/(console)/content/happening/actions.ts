"use server";

import { revalidatePath } from "next/cache";
import { requireAdminRole } from "@/server/auth/guard";
import { createHappening, updateHappening, setHappeningPublished, archiveHappening } from "@/server/content/happening";
import { createHappeningSchema, updateHappeningSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

const PAGE = "/admin/content/happening";

const fields = (fd: FormData) => ({
  kind: fd.get("kind"),
  emoji: fd.get("emoji") || undefined,
  title: fd.get("title"),
  detail: fd.get("detail") || undefined,
  href: fd.get("href") || undefined,
  priority: fd.get("priority") || 0,
  startsAt: fd.get("startsAt") || undefined,
  endsAt: fd.get("endsAt") || undefined,
});

export async function createHappeningAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const input = parseOrThrow(createHappeningSchema, { eventId: String(formData.get("eventId")), ...fields(formData) });
  await createHappening(session, input);
  revalidatePath(PAGE);
}

export async function updateHappeningAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const input = parseOrThrow(updateHappeningSchema, { id: String(formData.get("id")), eventId: String(formData.get("eventId")), ...fields(formData) });
  await updateHappening(session, input);
  revalidatePath(PAGE);
}

export async function publishHappeningAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  await setHappeningPublished(session, String(formData.get("id")), formData.get("published") === "true");
  revalidatePath(PAGE);
}

export async function archiveHappeningAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  await archiveHappening(session, String(formData.get("id")));
  revalidatePath(PAGE);
}
