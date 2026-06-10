/** Subtle page transition on each admin navigation. tw-animate-css utilities;
 *  motion-reduce respects the user's reduced-motion setting. */
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none">
      {children}
    </div>
  );
}
