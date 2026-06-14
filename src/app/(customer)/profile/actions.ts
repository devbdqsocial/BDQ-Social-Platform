"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/server/db";
import { getSession } from "@/server/auth/guard";

const schema = z.object({
  name: z.string().trim().max(80).optional(),
  email: z.union([z.string().trim().email().max(120), z.literal("")]).optional(),
});

/** Lightweight self-serve profile edit (name + email for receipts). Not a SaaS account console. */
export async function saveProfileAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login?next=/profile");
  const parsed = schema.safeParse({ name: formData.get("name") ?? undefined, email: formData.get("email") ?? undefined });
  if (!parsed.success) return;
  try {
    await db.user.update({
      where: { id: session.userId },
      data: { name: parsed.data.name || null, email: parsed.data.email || null },
    });
  } catch {
    // unique email collision etc. — silently ignore for this lightweight form
  }
  revalidatePath("/profile");
}
