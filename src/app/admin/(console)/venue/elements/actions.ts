"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/server/auth/guard";
import { saveElement, deleteElement } from "@/server/map/elements";
import { mapElementSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";

export async function saveElementAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  const id = formData.get("id") ? String(formData.get("id")) : undefined;
  const data = parseOrThrow(mapElementSchema, {
    name: formData.get("name"),
    kind: formData.get("kind"),
    widthFt: Number(formData.get("widthFt")),
    heightFt: Number(formData.get("heightFt")),
    color: String(formData.get("color") || "#3FA66A"),
    sellable: formData.get("sellable") === "on",
  });
  await saveElement(session, data, id);
  revalidatePath("/admin/venue/elements");
}

export async function deleteElementAction(formData: FormData): Promise<void> {
  const session = await requireSuperAdmin();
  await deleteElement(session, String(formData.get("id")));
  revalidatePath("/admin/venue/elements");
}
