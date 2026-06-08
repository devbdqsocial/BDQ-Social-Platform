"use client";

import { Button } from "@/components/ui/button";

/** Browser print → "Save as PDF". Avoids a server-side PDF dependency. */
export function PrintButton() {
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
      Print / PDF
    </Button>
  );
}
