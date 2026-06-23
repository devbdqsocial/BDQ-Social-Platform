"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { action } from "@/server/action";
import { createArtist, updateArtist, setArchived } from "@/server/artists/admin-service";
import { artistCreateSchema, artistUpdateSchema } from "@/server/schemas";
import type { Result } from "@/lib/result";

/** ₹ form field → integer paise (money rule). Blank/zero → undefined (no rate card). */
const rupeesToPaise = (v: FormDataEntryValue | null): number | undefined => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : undefined;
};

const fields = (fd: FormData) => ({
  stageName: fd.get("stageName"),
  realName: fd.get("realName") || undefined,
  type: fd.get("type") || undefined,
  genre: fd.get("genre") || undefined,
  bio: fd.get("bio") || undefined,
  city: fd.get("city") || undefined,
  phone: fd.get("phone") || undefined,
  whatsapp: fd.get("whatsapp") || undefined,
  email: fd.get("email") || undefined,
  instagram: fd.get("instagram") || undefined,
  askingFeePaise: rupeesToPaise(fd.get("askingFeeRupees")),
  notes: fd.get("notes") || undefined,
});

const create = action({ auth: "ARTIST_MANAGE", input: artistCreateSchema, handler: (s, d) => createArtist(s, d) });
const update = action({ auth: "ARTIST_MANAGE", input: artistUpdateSchema, handler: (s, d) => updateArtist(s, d) });
const archive = action({
  auth: "ARTIST_MANAGE",
  input: z.object({ id: z.string().min(1), archived: z.coerce.boolean() }),
  handler: (s, d) => setArchived(s, d.id, d.archived),
});

export async function createArtistAction(formData: FormData): Promise<Result<unknown>> {
  const res = await create(fields(formData));
  if (res.ok) {
    revalidatePath("/admin/artists");
    redirect(`/admin/artists/${(res.data as { id: string }).id}`);
  }
  return res;
}

export async function updateArtistAction(formData: FormData): Promise<Result<unknown>> {
  const id = String(formData.get("id"));
  const res = await update({ id, ...fields(formData) });
  if (res.ok) revalidatePath(`/admin/artists/${id}`);
  return res;
}

export async function setArtistArchivedAction(formData: FormData): Promise<Result<unknown>> {
  const id = String(formData.get("id"));
  const res = await archive({ id, archived: formData.get("archived") === "true" });
  if (res.ok) {
    revalidatePath("/admin/artists");
    revalidatePath(`/admin/artists/${id}`);
  }
  return res;
}
