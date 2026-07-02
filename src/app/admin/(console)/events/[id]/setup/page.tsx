import { redirect } from "next/navigation";

/** The multi-step setup wizard was retired in favour of landing directly on the unified tabbed
 * editor (`/admin/events/[id]`). This stub just keeps old bookmarked `?step=` links working. */
export default async function EventSetupWizardRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/events/${id}`);
}
