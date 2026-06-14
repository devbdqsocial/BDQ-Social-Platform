import { redirect } from "next/navigation";

// Onboarding merged into the /home status spine (vendor-portal.md §3). Deep links preserved.
export default async function VendorOnboarding({ searchParams }: { searchParams: Promise<{ step?: string }> }) {
  const { step } = await searchParams;
  redirect(step ? `/vendor/home?step=${encodeURIComponent(step)}` : "/vendor/home");
}
