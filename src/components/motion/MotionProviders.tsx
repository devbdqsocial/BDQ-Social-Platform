import { MaskDefs } from "./MaskDefs";
import { Cursor } from "./Cursor";
import { PageLoader } from "./PageLoader";
import { SmoothScroll } from "./SmoothScroll";
import { SectionColorSync } from "./SectionColorSync";
import { CookieBanner } from "./CookieBanner";

// Global motion chrome for customer-facing zones (landing, customer, vendor).
// NOT mounted in the admin console, which stays on its neutral, motion-free theme.
export function MotionProviders() {
  return (
    <>
      <MaskDefs />
      <SmoothScroll />
      <SectionColorSync />
      <Cursor />
      <PageLoader />
      <CookieBanner />
    </>
  );
}
