import type { Metadata } from "next";
import { MotionProviders } from "@/components/motion/MotionProviders";

export const metadata: Metadata = {
  title: "Get your invite · BDQ Social",
  description: "Vadodara's curated after-dark night market is almost here. Request your invite and we'll message you when the doors open.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Get your invite · BDQ Social",
    description: "Vadodara's curated night market — brands, food, music, performances. Request your invite.",
    type: "website",
  },
};

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bdq min-h-dvh">
      <MotionProviders />
      {children}
    </div>
  );
}
