"use server";

import { db } from "@/server/db";
import { hashPassword } from "@/lib/password";
import { readResetToken } from "@/server/auth/invite";

/** Set a new password from a reset link. Allowed even when a password already exists; bumps
 *  tokenVersion so any current sessions are invalidated. */
export async function setResetPassword(token: string, password: string): Promise<void> {
  const data = await readResetToken(token);
  if (!data?.email) throw new Error("This reset link is invalid or has expired.");
  const user = await db.user.findUnique({ where: { email: data.email }, select: { id: true, role: true } });
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) throw new Error("This reset link is no longer valid.");
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), tokenVersion: { increment: 1 } },
  });
}
