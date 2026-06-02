import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BDQ Social",
    short_name: "BDQ Social",
    description: "Vadodara's premium curated festival & night market.",
    start_url: "/",
    display: "standalone",
    background_color: "#120E09",
    theme_color: "#120E09",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
