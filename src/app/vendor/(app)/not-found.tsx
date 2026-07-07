import Link from "next/link";

export default function VendorNotFound() {
  return (
    <div className="max-w-[var(--w-prose)] space-y-[var(--space-lg)]">
      <p className="kicker opacity-60">404</p>
      <h1 className="f-exat f-h60">That page isn&apos;t here</h1>
      <p className="f-paragraph-small max-w-[46rem] opacity-75 text-pretty">
        The link may be old, or the market it pointed to has closed.
      </p>
      <Link href="/vendor/home" className="bdq-btn">
        Back to your home
      </Link>
    </div>
  );
}
