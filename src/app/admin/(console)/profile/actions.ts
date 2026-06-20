"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSession } from "@/server/auth/guard";
import { db } from "@/server/db";
import { hashPassword } from "@/lib/password";
import { revokeSessions, clearSession } from "@/server/auth/session";
import { Prisma } from "@prisma/client";

/** Self-service edits for the signed-in admin/staff member's own account. */

async function requireSelf() {
  const session = await getSession();
  if (!session) throw new Error("You must be logged in to update your profile.");
  return session;
}

/** Personal details: name, designation, phone, WhatsApp. */
export async function updateProfileAction(formData: FormData): Promise<void> {
  const session = await requireSelf();
  const name = String(formData.get("name") || "").trim() || null;
  const designation = String(formData.get("designation") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const whatsapp = String(formData.get("whatsapp") || "").trim() || null;

  try {
    await db.user.update({ where: { id: session.userId }, data: { name, designation, phone, whatsapp } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("That phone number is already registered to another account.");
    }
    throw e;
  }
  revalidatePath("/admin/profile");
}

/** Change password. Bumps tokenVersion so other sessions are revoked. */
export async function updatePasswordAction(formData: FormData): Promise<void> {
  const session = await requireSelf();
  const password = String(formData.get("password") || "");
  if (password.length < 8) throw new Error("Password must be at least 8 characters long.");
  await db.user.update({
    where: { id: session.userId },
    data: { passwordHash: await hashPassword(password), tokenVersion: { increment: 1 } },
  });
  revalidatePath("/admin/profile");
}

/** Display preferences (language, timezone, date format, currency). Stored as JSON. */
export async function updatePreferencesAction(formData: FormData): Promise<void> {
  const session = await requireSelf();
  const prefs = {
    locale: String(formData.get("locale") || "").trim() || null,
    timezone: String(formData.get("timezone") || "").trim() || null,
    dateFormat: String(formData.get("dateFormat") || "").trim() || null,
    currency: String(formData.get("currency") || "").trim() || null,
  };
  await db.user.update({ where: { id: session.userId }, data: { prefs } });
  revalidatePath("/admin/profile");
}

/** Sign out of every device: revoke all tokens (incl. this one) then drop the local cookie. */
export async function logoutAllAction(): Promise<void> {
  const session = await requireSelf();
  await revokeSessions(session.userId);
  await clearSession();
  redirect("/admin/login");
}
