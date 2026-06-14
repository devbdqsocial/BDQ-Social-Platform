import { redirect } from "next/navigation";

// Dashboard merged into the /home status spine (vendor-portal.md §3).
export default function VendorDashboard() {
  redirect("/vendor/home");
}
