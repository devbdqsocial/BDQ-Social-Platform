"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminRole } from "@/server/auth/guard";
import { createDoc, updateDoc, setDocStatus, deleteDoc, assignDoc, unassignDoc } from "@/server/legal/docs";
import { createLegalDocSchema, updateLegalDocSchema, assignDocSchema } from "@/server/schemas";
import { parseOrThrow } from "@/lib/validation";
import { pathForSlug } from "@/lib/legal-docs";
import { toResult } from "@/server/action";
import type { Result } from "@/lib/result";
import type { LegalDocStatus } from "@prisma/client";

const PAGE = "/admin/legal";

/** Public + admin surfaces that show this doc. */
function revalidateDoc(slug: string) {
  revalidateTag("legal-docs"); // footer links cache
  revalidatePath(pathForSlug(slug));
  revalidatePath(PAGE);
}

export async function createLegalDocAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const input = parseOrThrow(createLegalDocSchema, {
    title: String(formData.get("title")),
    slug: String(formData.get("slug")),
    category: formData.get("category"),
    audience: formData.get("audience"),
  });
  const row = await createDoc(session, input);
  revalidatePath(PAGE);
  redirect(`${PAGE}/${row.slug}`);
}

export async function updateLegalDocAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const input = parseOrThrow(updateLegalDocSchema, {
    id: String(formData.get("id")),
    title: String(formData.get("title")),
    category: formData.get("category"),
    audience: formData.get("audience"),
    sections: String(formData.get("sections")),
  });
  const row = await updateDoc(session, input);
  revalidateDoc(row.slug);
  revalidatePath(`${PAGE}/${row.slug}`);
}

export async function setDocStatusAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requireAdminRole();
    const status = String(formData.get("status")) as LegalDocStatus;
    const row = await setDocStatus(session, String(formData.get("id")), status);
    revalidateDoc(row.slug);
    revalidatePath(`${PAGE}/${row.slug}`);
  });
}

/** Permanent delete (cascades assignments). `redirect` field set = called from the editor page. */
export async function deleteLegalDocAction(formData: FormData): Promise<Result<null>> {
  return toResult(async () => {
    const session = await requireAdminRole();
    const row = await deleteDoc(session, String(formData.get("id")));
    revalidateDoc(row.slug);
    revalidatePath(`${PAGE}/assignments`);
    revalidatePath("/events/[slug]", "page");
    if (formData.get("redirect")) redirect(PAGE);
  });
}

export async function assignDocAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  const docId = String(formData.get("docId"));
  if (!docId) return; // nothing picked — no-op
  // Contract scope travels as one encoded target: "" = event default, "st:<id>" = stall type,
  // "vc:<category>" = vendor product category.
  const target = String(formData.get("target") ?? "");
  const input = parseOrThrow(assignDocSchema, {
    docId,
    eventId: String(formData.get("eventId")),
    stallTypeId: target.startsWith("st:") ? target.slice(3) : undefined,
    vendorCategory: target.startsWith("vc:") ? target.slice(3) : undefined,
    kind: formData.get("kind"),
  });
  await assignDoc(session, input);
  revalidatePath(`${PAGE}/assignments`);
  revalidatePath("/events/[slug]", "page");
}

export async function unassignDocAction(formData: FormData): Promise<void> {
  const session = await requireAdminRole();
  await unassignDoc(session, String(formData.get("id")));
  revalidatePath(`${PAGE}/assignments`);
  revalidatePath("/events/[slug]", "page");
}
