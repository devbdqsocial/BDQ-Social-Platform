"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";
import { phone10, normalizePhone } from "@/lib/validators";

export async function joinPlatformWaitlist(formData: FormData) {
  const interestedInStall = formData.get("interestedInStall") === "true";

  // Exactly 10 digits (first 6-9); stored as E.164 (+91…) to match the rest of the app.
  const parsed = phone10.safeParse(formData.get("phone"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Enter a valid 10-digit mobile number." };
  }
  const formattedPhone = normalizePhone(parsed.data);

  try {
    const existing = await db.waitlist.findFirst({
      where: {
        source: "PLATFORM",
        phone: formattedPhone,
      },
    });

    if (existing) {
      await db.waitlist.update({
        where: { id: existing.id },
        data: {
          type: interestedInStall ? "STALL" : "TICKET",
        },
      });
    } else {
      await db.waitlist.create({
        data: {
          source: "PLATFORM",
          type: interestedInStall ? "STALL" : "TICKET",
          phone: formattedPhone,
          contact: formattedPhone,
        },
      });
    }

    try {
      revalidatePath("/coming-soon");
    } catch {
      // ignore revalidation error in test environments
    }
    return { success: true };
  } catch (error) {
    console.error("Waitlist error:", error);
    return { error: "Failed to join waitlist. Please try again." };
  }
}
