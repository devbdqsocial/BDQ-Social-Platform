import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-3xl font-semibold">You&apos;re offline</h1>
      <p className="mt-2 text-muted-foreground">
        No connection right now. Your tickets are saved on your phone — reconnect to load the latest.
      </p>
      <Link href="/" className="mt-6 text-sm font-medium text-primary hover:underline">Try again</Link>
    </main>
  );
}
