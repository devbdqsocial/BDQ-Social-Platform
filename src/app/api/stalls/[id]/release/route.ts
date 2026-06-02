import { NextResponse } from "next/server";
import { getSession } from "@/server/auth/guard";
import { releaseStall } from "@/server/bookings/service";

export const runtime = "nodejs";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: { code: "UNAUTHENTICATED" } }, { status: 401 });
  }
  const { id } = await params;
  await releaseStall(session.userId, id);
  return NextResponse.json({ ok: true });
}
