"use client";

import { useEffect } from "react";

/** Registers the service worker (production only — dev uses HMR, no caching). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    if (window.location.hostname.startsWith("admin.") || window.location.pathname.startsWith("/admin")) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) void reg.unregister();
      }).catch(() => {});
      if ("caches" in window) {
        caches.keys().then((keys) => {
          for (const key of keys) if (key.startsWith("bdq-")) void caches.delete(key);
        }).catch(() => {});
      }
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
