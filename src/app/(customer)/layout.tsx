import { PublicHeader } from "@/components/nav/PublicHeader";
import { CustomerTabBar } from "@/components/nav/CustomerTabBar";
import { MotionProviders } from "@/components/motion/MotionProviders";
import { getSession } from "@/server/auth/guard";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <div className="rpa flex min-h-dvh flex-col">
      <MotionProviders />
      <PublicHeader signedIn={!!session} />
      <main id="main" className="flex-1 pb-16 sm:pb-0">{children}</main>
      <CustomerTabBar />
    </div>
  );
}
