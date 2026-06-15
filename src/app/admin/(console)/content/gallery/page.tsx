import type { Metadata } from "next";
import { requireAdminRole } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/admin/event-context";
import { listGalleryForAdmin } from "@/server/content/admin-gallery";
import { cld } from "@/lib/cloudinary-url";
import { GALLERY_MIN_PHOTOS } from "@/lib/content-gate";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GalleryUploader } from "@/components/admin/GalleryUploader";
import { setCaptionAction, togglePublishedAction, deletePhotoAction, moveAction, publishAllAction } from "./actions";

export const metadata: Metadata = { title: "Gallery" };

export default async function AdminGalleryPage() {
  await requireAdminRole();
  const { active } = await getActiveEvent();
  if (!active) {
    return (
      <div className="space-y-4">
        <PageHeader title="Gallery" description="Pick or create an event to manage its gallery." />
        <p className="text-sm text-muted-foreground">No active event. Choose one from the event switcher.</p>
      </div>
    );
  }

  const photos = await listGalleryForAdmin(active.id);
  const publishedCount = photos.filter((p) => p.published).length;
  const need = Math.max(0, GALLERY_MIN_PHOTOS - publishedCount);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title="Gallery"
        description={`Photos for ${active.name}. jpg/png/webp up to 10MB.`}
        actions={
          <div className="flex items-center gap-2">
            <form action={publishAllAction}><Button type="submit" variant="outline" size="sm">Publish all</Button></form>
            <GalleryUploader />
          </div>
        }
      />

      <p className={`rounded-md border px-3 py-2 text-sm ${need > 0 ? "border-warning/30 bg-warning/10 text-warning-foreground" : "border-success/30 bg-success/10 text-success"}`}>
        {need > 0
          ? `${publishedCount}/${GALLERY_MIN_PHOTOS} published — the customer gallery appears at ${GALLERY_MIN_PHOTOS}+ published photos (${need} to go).`
          : `Live — ${publishedCount} published photos are showing on the customer gallery.`}
      </p>

      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet — upload a few to get started.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {photos.map((p, i) => (
            <li key={p.id} className="overflow-hidden rounded-lg border border-border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cld(p.url, 480)} alt={p.caption ?? "Gallery photo"} className="aspect-[4/3] w-full object-cover" />
              <div className="space-y-2 p-3">
                <form action={setCaptionAction} className="flex gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <Input name="caption" defaultValue={p.caption ?? ""} placeholder="Caption (optional)" className="h-8 text-sm" />
                  <Button type="submit" size="sm" variant="outline">Save</Button>
                </form>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <form action={togglePublishedAction}>
                    <input type="hidden" name="id" value={p.id} />
                    <input type="hidden" name="published" value={(!p.published).toString()} />
                    <Button type="submit" size="sm" variant={p.published ? "default" : "outline"}>{p.published ? "Published" : "Publish"}</Button>
                  </form>
                  <div className="flex items-center gap-1">
                    <form action={moveAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="dir" value="up" /><Button type="submit" size="sm" variant="ghost" disabled={i === 0}>↑</Button></form>
                    <form action={moveAction}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="dir" value="down" /><Button type="submit" size="sm" variant="ghost" disabled={i === photos.length - 1}>↓</Button></form>
                    <form action={deletePhotoAction}><input type="hidden" name="id" value={p.id} /><Button type="submit" size="sm" variant="ghost">✕</Button></form>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
