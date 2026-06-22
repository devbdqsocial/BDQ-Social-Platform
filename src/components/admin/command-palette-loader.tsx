"use client";

import dynamic from "next/dynamic";

// cmdk (~30-40KB) ships on every admin page via the header. Lazy-load it so it's only fetched when
// the palette mounts; renders nothing until then (the ⌘K listener attaches once it loads).
const CommandPalette = dynamic(() => import("./command-palette").then((m) => m.CommandPalette), {
  ssr: false,
  loading: () => null,
});

export function CommandPaletteLoader({ allowed }: { allowed: string[] }) {
  return <CommandPalette allowed={allowed} />;
}
