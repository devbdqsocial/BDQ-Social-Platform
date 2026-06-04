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

    await db.platformWaitlist.upsert({
      where: { phone: formattedPhone },
      update: { interestedInStall },
      create: { phone: formattedPhone, interestedInStall },
    });

    revalidatePath("/coming-soon");
    return { success: true };
  } catch (error) {
    console.error("Waitlist error:", error);
    return { error: "Failed to join waitlist. Please try again." };
  }
}
