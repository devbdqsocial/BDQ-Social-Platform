import Link from "next/link";

export default function NotFound() {
  return (
    <div className="rpa gama-1 bg-1 paint flex min-h-[100svh] items-center justify-center">
      {/* plain div: segment 404s render inside (public)/layout which already owns <main id="main"> */}
      <div className="wrapper py-[var(--space-5xl)] text-center">
        <p className="kicker">Lost in the market</p>
        <h1 className="f-exat mt-[var(--space-md)]" style={{ fontSize: "var(--h235)", lineHeight: 0.95 }}>
          404
        </h1>
        <p className="f-paragraph mx-auto mt-[var(--space-lg)] max-w-[40ch] opacity-80">
          This page doesn&apos;t exist — but the night market does.
        </p>
        <div className="mt-[var(--space-2xl)] flex justify-center">
          <Link href="/" className="btn" data-cursor>
            <span className="btn__text">Take me home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
