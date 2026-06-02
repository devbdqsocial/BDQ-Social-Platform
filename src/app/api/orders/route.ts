import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/guard";
import { createOrderSchema } from "@/server/schemas";
import { CheckoutError, createTicketOrder } from "@/server/tickets/service";
import { enforceRateLimit } from "@/lib/ratelimit";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, "orders", 20, 10 * 60 * 1000);
  if (limited) return limited;

  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }

  let body;
  try {
    body = createOrderSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: { code: "VALIDATION" } }, { status: 422 });
  }

  try {
    const data = await createTicketOrder(session.userId, body.eventId, body.items, body.couponCode);
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    if (e instanceof CheckoutError) {
      return NextResponse.json({ ok: false, error: { code: e.code } }, { status: 409 });
    }
    console.error("createTicketOrder", e);
    return NextResponse.json({ ok: false, error: { code: "INTERNAL" } }, { status: 500 });
  }
}
