import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });

const domain = process.env.APP_BASE_DOMAIN;
const siteUrl = domain && !domain.includes("localhost") ? `https://${domain}` : "http://localhost:3000";
const description = "Vadodara's premium curated lifestyle festival & night market — indie brands, gourmet food, and live music.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "BDQ Social", template: "%s · BDQ Social" },
  description,
  icons: { icon: "/icon.svg" },
  openGraph: {
    type: "website",
    siteName: "BDQ Social",
    title: "BDQ Social",
    description,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: "BDQ Social", description },
};

export const viewport: Viewport = { themeColor: "#120E09" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jakarta.variable} ${fraunces.variable} ${geist.variable} antialiased`}>
        <a href="#main" className="skip-link">Skip to content</a>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
