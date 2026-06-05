import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Event Portal",
    short_name: "Event Portal",
    description: "Premium curated festival & night market.",
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
