import { rejectCrossOrigin } from "@/lib/origin";
import { NextResponse } from "next/server";
import { waitlistSchema } from "@/server/schemas";
import { joinWaitlist } from "@/server/waitlist/service";
import { enforceRateLimit } from "@/lib/ratelimit";
import { getSession } from "@/server/auth/guard";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const cross = rejectCrossOrigin(req);
  if (cross) return cross;

  const limited = await enforceRateLimit(req, "waitlist", 20, 10 * 60 * 1000);
  if (limited) return limited;

  let body;
  try {
    body = waitlistSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION" } }, { status: 422 });
  }

  const session = await getSession();
  await joinWaitlist({ ...body, userId: session?.userId });
  return NextResponse.json({ ok: true });
}
