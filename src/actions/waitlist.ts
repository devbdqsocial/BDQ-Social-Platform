"use server";

import { db } from "@/server/db";
import { revalidatePath } from "next/cache";

export async function joinPlatformWaitlist(formData: FormData) {
  const phone = formData.get("phone");
  const interestedInStall = formData.get("interestedInStall") === "true";

  if (!phone || typeof phone !== "string" || phone.length < 5) {
    return { error: "Invalid phone number." };
  }

  try {
    const formattedPhone = phone.replace(/\D/g, "");

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
