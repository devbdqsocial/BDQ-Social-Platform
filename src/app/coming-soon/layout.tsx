import { MotionProviders } from "@/components/motion/MotionProviders";

export default function ComingSoonLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="rpa min-h-dvh">
      <MotionProviders />
      {children}
    </div>
  );
}
