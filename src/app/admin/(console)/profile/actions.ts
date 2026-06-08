"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth/guard";
import { db } from "@/server/db";
import { hashPassword } from "@/lib/password";
import { Prisma } from "@prisma/client";

/**
 * Updates the profile details (name, phone, password) of the currently logged-in administrator.
 * Validates that only active session holders can modify their own accounts, and handles unique constraint failures.
 *
 * @throws {Error} If credentials or authorization boundaries are violated.
 */
export async function updateProfileAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) {
    throw new Error("You must be logged in to update your profile.");
  }

  const name = String(formData.get("name") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const password = String(formData.get("password") || "");

  const updateData: { name: string | null; phone: string | null; passwordHash?: string; tokenVersion?: { increment: number } } = {
    name,
    phone,
  };

  if (password) {
    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long.");
    }
    updateData.passwordHash = await hashPassword(password);
    // Force session token re-generation next time by bumping tokenVersion
    updateData.tokenVersion = { increment: 1 };
  }

  try {
    await db.user.update({
      where: { id: session.userId },
      data: updateData,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("That phone number is already registered to another account.");
    }
    throw e;
  }

  revalidatePath("/profile");
}
