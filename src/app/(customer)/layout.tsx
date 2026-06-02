import { PublicHeader } from "@/components/nav/PublicHeader";
import { CustomerTabBar } from "@/components/nav/CustomerTabBar";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <PublicHeader />
      <div id="main" className="flex-1 pb-16 sm:pb-0">{children}</div>
      <CustomerTabBar />
    </div>
  );
}
