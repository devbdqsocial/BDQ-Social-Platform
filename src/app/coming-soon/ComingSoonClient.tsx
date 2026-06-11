"use client";

import { useState, useEffect } from "react";
import { joinPlatformWaitlist } from "@/actions/waitlist";

const pad = (n: number) => String(n).padStart(2, "0");

export function ComingSoonClient({ count }: { count: number }) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [interestedInStall, setInterestedInStall] = useState(false);
  const [submittedPhone, setSubmittedPhone] = useState("");

  const targetDate = new Date("2026-10-01T12:00:00").getTime();
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const distance = targetDate - Date.now();
      if (distance < 0) {
        clearInterval(interval);
        return;
      }
      setTimeLeft({
        days: Math.floor(distance / 86400000),
        hours: Math.floor((distance % 86400000) / 3600000),
        minutes: Math.floor((distance % 3600000) / 60000),
        seconds: Math.floor((distance % 60000) / 1000),
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

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

  const units = [
    { label: "Days", value: timeLeft.days },
    { label: "Hours", value: timeLeft.hours },
    { label: "Mins", value: timeLeft.minutes },
    { label: "Secs", value: timeLeft.seconds },
  ];

  return (
    <div className="rpa gama-1 bg-1 paint relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      <main id="main" className="wrapper w-full max-w-[64rem] py-[var(--space-5xl)] text-center">
        <span className="f-paragraph-small f-bold t-upper" style={{ letterSpacing: "0.2em" }}>
          Vadodara&apos;s most anticipated social experience
        </span>
        <h1 className="f-exat mx-auto mt-[var(--space-lg)] max-w-[18ch]" style={{ fontSize: "var(--h133)", lineHeight: 0.95 }}>
          The next great gathering is coming
        </h1>
        <p className="f-paragraph mx-auto mt-[var(--space-lg)] max-w-[52ch] opacity-80">
          Discover curated markets, live experiences, creators, food, music, and meaningful connections.
        </p>

        {/* Countdown */}
        <div className="mt-[var(--space-3xl)] flex justify-center gap-[var(--space-xl)] sm:gap-[var(--space-3xl)]">
          {units.map((u) => (
            <div key={u.label} className="text-center">
              <div className="f-exat tabular-nums" style={{ fontSize: "var(--h100)", lineHeight: 1 }}>{pad(u.value)}</div>
              <div className="f-paragraph-small f-bold t-upper opacity-75" style={{ letterSpacing: "0.14em" }}>{u.label}</div>
            </div>
          ))}
        </div>

        {/* Form / success */}
        {status === "success" ? (
          <div className="mx-auto mt-[var(--space-3xl)] max-w-[40rem] rounded-[var(--radius-lg)] border p-[var(--space-xl)]" style={{ borderColor: "var(--color)" }}>
            <p className="f-exat" style={{ fontSize: "var(--h42)" }}>You&apos;re on the list.</p>
            <p className="f-paragraph-small mt-[var(--space-sm)] opacity-80">
              We&apos;ll notify {submittedPhone || "you"} on WhatsApp the moment we go live.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mx-auto mt-[var(--space-3xl)] max-w-[42rem]">
            <div className="flex flex-col items-stretch justify-center gap-[var(--space-lg)] sm:flex-row sm:items-end">
              <div className="flex flex-1 items-end gap-[var(--space-sm)]" style={{ borderBottom: "1px solid var(--color)" }}>
                <span className="f-exat pb-[var(--space-md)]" style={{ fontSize: "var(--h42)" }}>+91</span>
                <input
                  type="tel"
                  name="phone"
                  placeholder="98765 43210"
                  required
                  disabled={status === "loading"}
                  className="f-exat w-full bg-transparent pb-[var(--space-md)] outline-none disabled:opacity-50"
                  style={{ fontSize: "var(--h42)", color: "var(--color)" }}
                />
              </div>
              <button type="submit" disabled={status === "loading"} className="btn shrink-0 self-center sm:self-end" data-cursor>
                <span className="btn__text">{status === "loading" ? "Joining…" : "Join"}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setInterestedInStall((v) => !v)}
              className="f-paragraph-small mt-[var(--space-lg)] flex items-center gap-[var(--space-sm)]"
              data-cursor
            >
              <span
                className="grid size-[1.1em] place-items-center rounded-[3px] border"
                style={{ borderColor: "var(--color)", background: interestedInStall ? "var(--color)" : "transparent" }}
              >
                {interestedInStall && <span className="size-[0.5em]" style={{ background: "var(--bgcolor)" }} />}
              </span>
              <span className="f-bold t-upper" style={{ letterSpacing: "0.08em" }}>I want to exhibit my brand at the event</span>
            </button>

            {status === "error" && <p className="f-paragraph-small mt-[var(--space-md)]">{message}</p>}
          </form>
        )}

        {count > 0 && status !== "success" && (
          <p className="f-paragraph-small mt-[var(--space-2xl)] opacity-75">
            Join {count.toLocaleString()} others already on the waitlist
          </p>
        )}
      </main>

      <div className="f-paragraph-small absolute bottom-[var(--space-lg)] opacity-70">
        © {new Date().getFullYear()} BDQ Social
      </div>
    </div>
  );
}
