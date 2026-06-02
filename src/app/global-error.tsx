"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("global-error", error.message, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, background: "#FBF7F0", color: "#352F26" }}>
        <div style={{ textAlign: "center", padding: "1rem" }}>
          <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#6F6552" }}>Please reload the page.</p>
          <button onClick={reset} style={{ marginTop: "1rem", padding: "0.5rem 1.25rem", borderRadius: 8, border: "none", background: "#C2603B", color: "#fff" }}>
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
