import type { Metadata } from "next";
import { requirePermission } from "@/server/auth/guard";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ArtistForm } from "../ArtistForm";

export const metadata: Metadata = { title: "Add artist" };

export default async function NewArtistPage() {
  await requirePermission("ARTIST_MANAGE");
  return (
    <div className="space-y-6">
      <PageHeader title="Add artist" description="Create a roster entry. Bookings, set times and settlement are managed on the artist's page." />
      <Card>
        <CardContent className="pt-6">
          <ArtistForm />
        </CardContent>
      </Card>
    </div>
  );
}
