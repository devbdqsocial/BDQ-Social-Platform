import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/server/auth/guard";
import { listArtists } from "@/server/artists/admin-service";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ArtistsTable } from "@/components/admin/tables/ArtistsTable";

export const metadata: Metadata = { title: "Artists" };

export default async function AdminArtistsPage() {
  await requirePermission("ARTIST_VIEW");
  const artists = await listArtists();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Artists"
        description="Your talent roster — types, rate cards, bookings and settlement."
        actions={<Button asChild><Link href="/admin/artists/new">Add artist</Link></Button>}
      />
      <ArtistsTable artists={artists} />
    </div>
  );
}
