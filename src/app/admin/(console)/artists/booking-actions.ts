"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { action } from "@/server/action";
import { createBooking, updateBooking, logNegotiation, setBookingStatus, recordPayout } from "@/server/artists/bookings-service";
import type { Result } from "@/lib/result";

const rupeesToPaise = (v: FormDataEntryValue | null): number | undefined => {
  const n = Number(String(v ?? "").trim());
  return Number.isFinite(n) && n >= 0 && String(v ?? "").trim() !== "" ? Math.round(n * 100) : undefined;
};
const dateOrNull = (v: FormDataEntryValue | null): Date | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};
const strOrNull = (v: FormDataEntryValue | null): string | null => String(v ?? "").trim() || null;

const revalidate = (fd: FormData) => {
  const artistId = fd.get("artistId");
  const eventId = fd.get("eventId");
  if (artistId) revalidatePath(`/admin/artists/${artistId}`);
  if (eventId) revalidatePath(`/admin/events/${eventId}`);
};

const create = action({
  auth: "ARTIST_MANAGE",
  input: z.object({ eventId: z.string().min(1), artistId: z.string().min(1) }),
  handler: (s, d) => createBooking(s, d.eventId, d.artistId),
});

const update = action({
  auth: "ARTIST_MANAGE",
  input: z.object({
    id: z.string().min(1),
    agreedFeePaise: z.number().int().min(0).optional(),
    setStartsAt: z.date().nullable(),
    setEndsAt: z.date().nullable(),
    stageOrZone: z.string().nullable(),
    published: z.boolean(),
  }),
  handler: (s, { id, ...rest }) => updateBooking(s, id, rest),
});

const negotiate = action({
  auth: "ARTIST_MANAGE",
  input: z.object({ id: z.string().min(1), note: z.string().trim().min(1, "Add a note"), agreedFeePaise: z.number().int().min(0).optional() }),
  handler: (s, d) => logNegotiation(s, d.id, d.note, d.agreedFeePaise),
});

const status = action({
  auth: "ARTIST_MANAGE",
  input: z.object({ id: z.string().min(1), status: z.enum(["CONFIRMED", "CANCELLED"]) }),
  handler: (s, d) => setBookingStatus(s, d.id, d.status),
});

export async function createBookingAction(fd: FormData): Promise<Result<unknown>> {
  const res = await create({ eventId: String(fd.get("eventId")), artistId: String(fd.get("artistId")) });
  if (res.ok) revalidate(fd);
  return res;
}

export async function updateBookingAction(fd: FormData): Promise<Result<unknown>> {
  const res = await update({
    id: String(fd.get("id")),
    agreedFeePaise: rupeesToPaise(fd.get("agreedFeeRupees")),
    setStartsAt: dateOrNull(fd.get("setStartsAt")),
    setEndsAt: dateOrNull(fd.get("setEndsAt")),
    stageOrZone: strOrNull(fd.get("stageOrZone")),
    published: fd.get("published") === "on",
  });
  if (res.ok) revalidate(fd);
  return res;
}

export async function logNegotiationAction(fd: FormData): Promise<Result<unknown>> {
  const res = await negotiate({ id: String(fd.get("id")), note: String(fd.get("note") ?? ""), agreedFeePaise: rupeesToPaise(fd.get("agreedFeeRupees")) });
  if (res.ok) revalidate(fd);
  return res;
}

export async function setBookingStatusAction(fd: FormData): Promise<Result<unknown>> {
  const res = await status({ id: String(fd.get("id")), status: fd.get("status") === "CONFIRMED" ? "CONFIRMED" : "CANCELLED" });
  if (res.ok) revalidate(fd);
  return res;
}

const payout = action({
  auth: "ARTIST_MANAGE",
  input: z.object({
    id: z.string().min(1),
    amountPaise: z.number().int().min(1, "Enter a payout amount"),
    status: z.enum(["DRAFT", "APPROVED", "PAID"]).default("PAID"),
  }),
  handler: (s, d) => recordPayout(s, d.id, d),
});

export async function recordPayoutAction(fd: FormData): Promise<Result<unknown>> {
  const res = await payout({
    id: String(fd.get("id")),
    amountPaise: rupeesToPaise(fd.get("payoutRupees")) ?? 0,
    status: fd.get("payoutStatus") === "APPROVED" ? "APPROVED" : fd.get("payoutStatus") === "DRAFT" ? "DRAFT" : "PAID",
  });
  if (res.ok) revalidate(fd);
  return res;
}
