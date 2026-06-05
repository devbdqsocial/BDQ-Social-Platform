import { requireVendor } from "@/server/auth/guard";
import { getProfile } from "@/server/vendors/service";
import { listLeads } from "@/server/leads/service";
import { toCsv } from "@/lib/csv";
import { parseSkip } from "@/lib/utils";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const limited = await enforceRateLimit(req, "export-leads", 10, 60 * 60 * 1000);
  if (limited) return limited;

  let profileId: string | null = null;
  try {
    const session = await requireVendor();
    const profile = await getProfile(session.userId);
    profileId = profile?.id ?? null;
  } catch {
    return new Response("Forbidden", { status: 403 });
  }
  if (!profileId) return new Response("No profile", { status: 404 });

  const skip = parseSkip(new URL(req.url).searchParams.get("skip"));
  const leads = await listLeads(profileId, skip);
  const csv = toCsv(
    leads.map((l) => ({ name: l.name ?? "", phone: l.phone ?? "", email: l.email ?? "", consent: l.consent ? "yes" : "no", createdAt: l.createdAt.toISOString() })),
    [
      { key: "name", label: "Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "consent", label: "Consent" },
      { key: "createdAt", label: "Captured" },
    ],
  );

  return new Response(csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="leads.csv"' },
  });
}
