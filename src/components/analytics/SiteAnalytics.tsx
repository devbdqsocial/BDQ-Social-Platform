import { getAnalyticsSettings } from "@/server/settings/service";

/**
 * Injects GA4 / Meta Pixel / Microsoft Clarity when IDs are configured (Settings › Analytics). Fully inert
 * when unset. IDs are interpolated into inline scripts, so they are hard-sanitised to an id charset to
 * prevent script injection. Scripts carry the CSP nonce; `'strict-dynamic'` lets them load their loaders.
 */

const cleanId = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "");

export async function SiteAnalytics({ nonce }: { nonce?: string }) {
  const a = await getAnalyticsSettings();
  const ga4 = cleanId(a.ga4);
  const pixel = cleanId(a.metaPixel);
  const clarity = cleanId(a.clarity);
  if (!ga4 && !pixel && !clarity) return null;

  return (
    <>
      {ga4 && (
        <>
          <script nonce={nonce} async src={`https://www.googletagmanager.com/gtag/js?id=${ga4}`} />
          <script
            nonce={nonce}
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga4}');`,
            }}
          />
        </>
      )}
      {pixel && (
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${pixel}');fbq('track','PageView');`,
          }}
        />
      )}
      {clarity && (
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${clarity}");`,
          }}
        />
      )}
    </>
  );
}
