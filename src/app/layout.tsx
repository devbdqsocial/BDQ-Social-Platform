import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { SiteAnalytics } from "@/components/analytics/SiteAnalytics";
import { getSeoSettings } from "@/server/settings/service";

// Body/UI = Inter (RPA `--f-inter`). Admin keeps Geist. Display = self-hosted Exat-Bold (RPA `--f-exat`).
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const exat = localFont({
  src: "./fonts/exatcyrwide-bold.woff2",
  variable: "--font-exat",
  weight: "700",
  display: "swap",
});

const domain = process.env.APP_BASE_DOMAIN;
const siteUrl = domain && !domain.includes("localhost") ? `https://${domain}` : "http://localhost:3000";
const DEFAULT_TITLE = "BDQ Social — Curated Night Market, Vadodara";
const DEFAULT_DESC = "Vadodara's premium curated lifestyle festival & night market — indie brands, gourmet food, and live music.";

// Admin-editable SEO overrides the defaults below (Settings › SEO); blank fields keep the defaults.
export async function generateMetadata(): Promise<Metadata> {
  const seo = await getSeoSettings();
  const title = seo.title || DEFAULT_TITLE;
  const description = seo.description || DEFAULT_DESC;
  const images = seo.ogImage ? [{ url: seo.ogImage }] : undefined;
  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: "%s · BDQ Social" },
    description,
    keywords: ["night market", "Vadodara", "festival", "indie brands", "live music", "BDQ Social"],
    icons: { icon: "/icon.svg" },
    openGraph: { type: "website", siteName: "BDQ Social", title, description, locale: "en_IN", images },
    twitter: { card: "summary_large_image", title: seo.title || "BDQ Social", description, images },
  };
}

export const viewport: Viewport = { themeColor: "#01065B" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // CSP nonce minted in middleware (prod); next-themes' pre-hydration script needs it under a strict CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Font vars must sit on <html>: the --f-exat/--f-inter aliases are declared at :root, and
  // custom-property var() substitution happens where the property is declared — <body> is too late.
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${exat.variable} ${geist.variable}`}>
      <body className="antialiased">
        <a href="#main" className="skip-link">Skip to content</a>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange nonce={nonce}>
          {children}
        </ThemeProvider>
        <ServiceWorkerRegister />
        <SiteAnalytics nonce={nonce} />
      </body>
    </html>
  );
}
