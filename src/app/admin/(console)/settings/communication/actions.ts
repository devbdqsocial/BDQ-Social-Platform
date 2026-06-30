"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { phoneE164 } from "@/lib/validators";
import { requireAdminRole } from "@/server/auth/guard";
import { sendWhatsAppTest } from "@/server/settings/communication";

const testSchema = z.object({
  phone: phoneE164,
  message: z.string().trim().min(1).max(4096),
  sendSampleQr: z.boolean(),
});

export async function sendWhatsAppTestAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const input = testSchema.parse({
    phone: formData.get("phone"),
    message: formData.get("message"),
    sendSampleQr: formData.get("sendSampleQr") === "on",
  });
  await sendWhatsAppTest(session, input);
  revalidatePath("/admin/settings/communication");
  redirect("/admin/settings/communication?test=sent");
}
