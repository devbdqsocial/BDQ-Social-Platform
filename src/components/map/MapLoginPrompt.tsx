import Link from "next/link";

export function MapLoginPrompt({ href }: { href: string }) {
  return (
    <div className="p-[var(--space-xl)] text-center" style={{ border: "1px dashed var(--color)" }}>
      <p className="f-exat f-h42">Verify with OTP to view the stall layout</p>
      <p className="f-paragraph-small mx-auto mt-[var(--space-sm)] max-w-[44ch] opacity-70">
        Sign in with your phone number to unlock the live stall map.
      </p>
      <Link href={href} className="btn mt-[var(--space-lg)]" data-cursor>
        <span className="btn__text">Sign in to view map</span>
      </Link>
    </div>
  );
}
