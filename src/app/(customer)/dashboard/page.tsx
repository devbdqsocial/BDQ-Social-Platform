import { redirect } from "next/navigation";

// The wallet now lives at /tickets (customer-portal §2). /home (R3.10) will take this slot later;
// until then /dashboard points at the wallet so existing links + the post-login landing still work.
export default async function DashboardRedirect({ searchParams }: { searchParams: Promise<{ paid?: string; reveal?: string }> }) {
  const { paid, reveal } = await searchParams;
  const id = reveal ?? paid;
  redirect(id ? `/tickets?reveal=${id}` : "/tickets");
}
