import { NextResponse } from "next/server";
import { leadSchema } from "@/server/schemas";
import { captureLead, currentLeadEventId } from "@/server/leads/service";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, "leads", 30, 10 * 60 * 1000);
  if (limited) return limited;

  let body;
  try {
    body = leadSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION" } }, { status: 422 });
  }

  const eventId = await currentLeadEventId();
  if (!eventId) return NextResponse.json({ ok: false, error: { code: "NO_EVENT" } }, { status: 409 });

  await captureLead({ ...body, eventId });
  return NextResponse.json({ ok: true });
}
