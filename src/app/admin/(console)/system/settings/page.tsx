import { redirect } from "next/navigation";

/** Old global-settings stub — superseded by the role-aware Settings hub at /admin/settings. */
export default function SystemSettingsRedirect() {
  redirect("/admin/settings");
}
