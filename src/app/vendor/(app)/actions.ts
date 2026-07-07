"use server";

import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { markVendorNotificationsRead } from "@/server/notifications/vendor";

export async function markVendorNotificationsReadAction(): Promise<void> {
  const session = await requireVendor();
  const profile = await getProfile(session.userId);
  if (!profile) return;
  await markVendorNotificationsRead(profile.id);
}
