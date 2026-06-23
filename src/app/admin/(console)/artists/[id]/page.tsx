import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/server/auth/guard";
import { getArtist } from "@/server/artists/admin-service";
import { listAdminEvents } from "@/server/admin/event-context";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ActionForm } from "@/components/admin/action-form";
import { ArtistForm } from "../ArtistForm";
import { ArchiveButton } from "./ArchiveButton";
import { BookingPanel } from "@/components/admin/BookingPanel";
import { createBookingAction } from "../booking-actions";

export const metadata: Metadata = { title: "Artist" };

const titleCase = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default async function ArtistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("ARTIST_VIEW");
  const { id } = await params;
  const [artist, events] = await Promise.all([getArtist(id), listAdminEvents()]);
  if (!artist) notFound();

  return (
    <div className="space-y-6">
      <PageHeader
        title={artist.stageName}
        description={[titleCase(artist.type), artist.genre, artist.city].filter(Boolean).join(" · ") || undefined}
        actions={<ArchiveButton id={artist.id} archived={artist.archived} />}
      />

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Roster details + rate card.</CardDescription>
        </CardHeader>
        <CardContent>
          <ArtistForm initial={artist} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bookings</CardTitle>
          <CardDescription>Per-event engagements — negotiate, set the time, confirm. Confirmed sets show on the public lineup.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ActionForm action={createBookingAction} success="Added to lineup" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="artistId" value={artist.id} />
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Add to an event</span>
              <Select name="eventId" required className="w-64" defaultValue="">
                <option value="" disabled>Choose an event…</option>
                {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
            </label>
            <Button type="submit" size="sm">Add booking</Button>
          </ActionForm>

          {artist.bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          ) : (
            <div className="grid gap-3">
              {artist.bookings.map((b) => (
                <BookingPanel
                  key={b.id}
                  title={b.event.name}
                  booking={{
                    id: b.id,
                    artistId: artist.id,
                    eventId: b.eventId,
                    status: b.status,
                    settlement: b.settlement,
                    agreedFeePaise: b.agreedFeePaise,
                    setStartsAt: b.setStartsAt ? b.setStartsAt.toISOString() : null,
                    setEndsAt: b.setEndsAt ? b.setEndsAt.toISOString() : null,
                    stageOrZone: b.stageOrZone,
                    published: b.published,
                    negotiationNote: b.negotiationNote,
                    payouts: b.payouts.map((p) => ({ amountPaise: p.amountPaise, status: p.status, incurredAt: p.incurredAt.toISOString() })),
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
