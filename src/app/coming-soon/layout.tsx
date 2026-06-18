import { Cormorant_Garamond } from "next/font/google";

// Elegant serif for the bespoke "Invitation" gate only — scoped to this route so it never ships
// with the rest of the app. Self-hosted by next/font (same-origin → CSP-safe).
const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return <div className={serif.variable}>{children}</div>;
}
