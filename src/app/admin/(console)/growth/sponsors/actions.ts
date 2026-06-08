"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/auth/guard";
import { createSponsor, deleteSponsor, updateSponsor } from "@/server/sponsors/service";
import { sponsorSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";
import { SponsorshipStatus } from "@prisma/client";

export async function createSponsorAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const hasFinance = session.role === "SUPER_ADMIN" || session.role === "ADMIN" || session.permissions.includes("FINANCE_MANAGE");

  const amountRupees = formData.get("amountRupees");
  const data = parseOrThrow(sponsorSchema, {
    eventId: formData.get("eventId"),
    name: formData.get("name"),
    tier: formData.get("tier"),
    logoUrl: formData.get("logoUrl") || "",
    amountPaise: hasFinance && amountRupees !== null ? Math.round(Number(amountRupees) * 100) : 0,
    status: hasFinance ? (formData.get("status") as SponsorshipStatus) : "PROPOSED",
    note: hasFinance ? (formData.get("note") as string) : undefined,
  });

  await createSponsor(session, data);
  revalidatePath("/admin/growth/sponsors");
  revalidatePath("/");
}

export async function updateSponsorAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  const hasFinance = session.role === "SUPER_ADMIN" || session.role === "ADMIN" || session.permissions.includes("FINANCE_MANAGE");

  const id = String(formData.get("id"));
  const amountRupees = formData.get("amountRupees");
  const data = parseOrThrow(sponsorSchema, {
    eventId: formData.get("eventId"),
    name: formData.get("name"),
    tier: formData.get("tier"),
    logoUrl: formData.get("logoUrl") || "",
    amountPaise: hasFinance && amountRupees !== null ? Math.round(Number(amountRupees) * 100) : undefined,
    status: hasFinance ? (formData.get("status") as SponsorshipStatus) : undefined,
    note: hasFinance ? (formData.get("note") as string) : undefined,
  });

  await updateSponsor(session, id, data);
  revalidatePath("/admin/growth/sponsors");
  revalidatePath("/");
}

export async function deleteSponsorAction(formData: FormData): Promise<void> {
  const session = await requireAdmin();
  await deleteSponsor(session, String(formData.get("id")));
  revalidatePath("/admin/growth/sponsors");
  revalidatePath("/");
}
