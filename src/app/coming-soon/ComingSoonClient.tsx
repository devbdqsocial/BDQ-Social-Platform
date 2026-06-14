"use client";

import { useState, useEffect, useMemo } from "react";
import { joinPlatformWaitlist } from "@/actions/waitlist";
import { timeLeft, type TimeLeft } from "@/lib/countdown";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { WordmarkWall } from "@/components/motion/WordmarkWall";

const pad = (n: number) => String(n).padStart(2, "0");

/** rAF count-up to `target`; jumps straight to the value when motion is reduced. */
function useCountUp(target: number, animate: boolean) {
  const [n, setN] = useState(animate ? 0 : target);
  useEffect(() => {
    if (!animate || target <= 0) { setN(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 1200);
      setN(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, animate]);
  return n;
}

export function ComingSoonClient({ count, targetIso }: { count: number; targetIso: string | null }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [interestedInStall, setInterestedInStall] = useState(false);
  const [submittedPhone, setSubmittedPhone] = useState("");
  const [reduced, setReduced] = useState(false);

  useEffect(() => { setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);

  // Dynamic target from the next event (R3.1) — reuse the tested countdown lib, no hardcoded date.
  const target = useMemo(() => (targetIso ? new Date(targetIso) : null), [targetIso]);
  const [left, setLeft] = useState<TimeLeft | null>(() => (target ? timeLeft(target) : null));
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setLeft(timeLeft(target)), 1000);
    return () => clearInterval(id);
  }, [target]);

  const shownCount = useCountUp(count, !reduced);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    const formData = new FormData(e.currentTarget);
    formData.set("interestedInStall", String(interestedInStall));
    const phone = formData.get("phone") as string;
    const result = await joinPlatformWaitlist(formData);
    if (result.error) {
      setStatus("error");
      setMessage(result.error);
    } else {
      setStatus("success");
      setSubmittedPhone(phone);
    }
  };

  const units = left
    ? [
        { label: "Days", value: left.days },
        { label: "Hrs", value: left.hours },
        { label: "Min", value: left.mins },
        { label: "Sec", value: left.secs },
      ]
    : [];

  return (
    <div className="rpa gama-1 bg-1 bg-ink relative flex min-h-[100svh] items-center overflow-hidden" style={{ color: "var(--color)" }}>
      {/* animated lavender glow + low-opacity wordmark texture + floating branded shape */}
      <div aria-hidden className="coming-glow pointer-events-none absolute inset-0" style={{ background: "radial-gradient(55% 45% at 28% 8%, rgba(134,142,255,0.20), transparent 70%)" }} />
      <WordmarkWall rows={6} mobileRows={4} duration={34} rowClassName="f-h133" className="pointer-events-none absolute inset-0 flex flex-col justify-between py-[var(--space-lg)] opacity-[0.05]" />
      <div aria-hidden className="coming-float pointer-events-none absolute right-[-8%] top-[8%] hidden w-[46vw] max-w-[640px] lg:block" style={{ opacity: 0.9 }}>
        <div className="svg svg--form11 w-full"><div className="svg__bg" /></div>
      </div>

      <main id="main" className="wrapper relative z-10 w-full py-[var(--space-5xl)]">
        <div className="max-w-[42rem]">
          <span className="kicker block">Vadodara&apos;s most anticipated social experience</span>

          <SplitReveal as="h1" mode="chars" className="f-exat mt-[var(--space-lg)] max-w-[15ch] f-h133">
            The next great gathering is coming
          </SplitReveal>

          <p className="f-paragraph mt-[var(--space-lg)] max-w-[46ch] opacity-85">
            Curated markets, live experiences, creators, food and music — and the people who turn a night into a memory.
          </p>

          {left && !left.done && (
            <div className="mt-[var(--space-2xl)] flex gap-[var(--space-2xl)]">
              {units.map((u) => (
                <div key={u.label}>
                  <div className="f-exat tabular-nums f-h76">{pad(u.value)}</div>
                  <div className="kicker opacity-65">{u.label}</div>
                </div>
              ))}
            </div>
          )}

          {status === "success" ? (
            <div className="mt-[var(--space-2xl)] max-w-[34rem] rounded-[var(--radius-lg)] p-[var(--space-xl)]" style={{ border: "1px solid var(--color)" }}>
              <p className="f-exat f-h42">You&apos;re on the list.</p>
              <p className="f-paragraph-small mt-[var(--space-sm)] opacity-80">
                We&apos;ll WhatsApp {submittedPhone || "you"} the moment we go live.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-[var(--space-2xl)] max-w-[34rem]">
              {/* Capture — prefix + number same size/baseline, Join inline beside the field on every screen */}
              <div className="flex items-end gap-[var(--space-md)]">
                <div className="flex min-w-0 flex-1 items-baseline gap-[var(--space-sm)] pb-[var(--space-sm)]" style={{ borderBottom: "1px solid var(--color)" }}>
                  <span className="f-exat shrink-0 tabular-nums f-h32">+91</span>
                  <input
                    type="tel"
                    name="phone"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    placeholder="98765 43210"
                    required
                    disabled={status === "loading"}
                    className="f-exat w-full min-w-0 bg-transparent tabular-nums outline-none placeholder:opacity-40 disabled:opacity-50 f-h32"
                    style={{ color: "var(--color)" }}
                  />
                </div>
                <button type="submit" disabled={status === "loading"} className="btn btn--accent shrink-0" data-cursor>
                  <span className="btn__text">{status === "loading" ? "Joining…" : "Join"}</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setInterestedInStall((v) => !v)}
                aria-pressed={interestedInStall}
                className="f-paragraph-small mt-[var(--space-lg)] flex items-center gap-[var(--space-sm)]"
                data-cursor
              >
                <span className="grid size-[1.15em] shrink-0 place-items-center rounded-[3px] border" style={{ borderColor: "var(--color)", background: interestedInStall ? "var(--color)" : "transparent" }}>
                  {interestedInStall && <span className="size-[0.5em]" style={{ background: "var(--bgcolor)" }} />}
                </span>
                <span className="f-bold t-upper" style={{ letterSpacing: "0.08em" }}>I want to exhibit my brand at the event</span>
              </button>

              {status === "error" && <p role="alert" className="f-paragraph-small mt-[var(--space-md)] opacity-90">{message}</p>}
            </form>
          )}

          {count > 0 && status !== "success" && (
            <p className="f-paragraph-small mt-[var(--space-xl)] flex items-center gap-[var(--space-sm)] opacity-85">
              <span aria-hidden className="coming-glow inline-block size-2 rounded-full" style={{ background: "var(--color)" }} />
              <b className="tabular-nums">{shownCount.toLocaleString()}</b> already on the waitlist
            </p>
          )}
        </div>
      </main>

      <div className="kicker absolute inset-x-0 bottom-[var(--space-lg)] z-10 text-center opacity-55">© {new Date().getFullYear()} BDQ Social · Vadodara</div>
    </div>
  );
}
