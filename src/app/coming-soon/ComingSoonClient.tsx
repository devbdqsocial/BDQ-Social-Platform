"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { joinPlatformWaitlist } from "@/actions/waitlist";

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
      if (distance < 0) { clearInterval(interval); return; }
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

  return (
    <div className="relative font-sans min-h-screen flex flex-col items-center justify-center bg-black text-white overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90 z-10" />
        <div
          className="absolute inset-0 z-0 bg-cover bg-[center_top_20%] bg-no-repeat"
          style={{ backgroundImage: "url('/assets/coming-soon/coming-soon-bg-comp.png')" }}
        />
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-[120px] mix-blend-screen"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, delay: 1 }}
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/20 rounded-full blur-[120px] mix-blend-screen"
        />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="z-20 w-full max-w-2xl p-8 md:p-12 mx-4 rounded-3xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl"
      >
        <div className="text-center space-y-6">
          {/* Badge */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase px-4 py-1.5 rounded-full bg-white/10 border border-white/15 text-zinc-300">
              Vadodara&apos;s Premier Lifestyle Festival
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="font-display text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.1] bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-300 pb-3"
          >
            Vadodara&apos;s Biggest Flea <br className="hidden sm:block" /> is Coming Soon
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-base sm:text-lg text-zinc-300 max-w-lg mx-auto"
          >
            Curated stalls, live music, gourmet bites — all in one place. Join the waitlist to get early access and WhatsApp updates.
          </motion.p>

          {/* Countdown */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 py-4 max-w-md mx-auto w-full px-1"
          >
            {[
              { label: "Days", value: timeLeft.days },
              { label: "Hours", value: timeLeft.hours },
              { label: "Mins", value: timeLeft.minutes },
              { label: "Secs", value: timeLeft.seconds },
            ].map((unit, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-inner">
                <span className="text-xl sm:text-3xl md:text-4xl font-bold tabular-nums text-white">{String(unit.value).padStart(2, "0")}</span>
                <span className="text-[10px] sm:text-xs text-zinc-400 font-medium uppercase tracking-wider mt-1">{unit.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Form or Success state */}
          {status === "success" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md mx-auto w-full rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 px-6 py-5 flex flex-col items-center gap-2"
            >
              <div className="w-10 h-10 rounded-full bg-[#25D366]/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#25D366]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[#25D366] font-semibold text-sm">You&apos;re on the list!</p>
              <p className="text-zinc-400 text-xs">We&apos;ll notify <span className="text-white font-medium">{submittedPhone}</span> on WhatsApp when we go live.</p>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              onSubmit={handleSubmit}
              className="max-w-md mx-auto w-full space-y-3"
            >
              {/* Phone input with +91 prefix */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex flex-1 items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-white/20 transition-all">
                  <span className="px-4 py-4 text-zinc-400 text-sm font-medium border-r border-white/10 shrink-0">+91</span>
                  <input
                    type="tel"
                    name="phone"
                    placeholder="98765 43210"
                    required
                    disabled={status === "loading"}
                    className="flex-1 bg-transparent px-4 py-4 text-white placeholder:text-zinc-500 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="bg-white text-black font-semibold rounded-xl px-8 py-4 hover:bg-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                >
                  {status === "loading" ? "Joining..." : "Get Updates"}
                </button>
              </div>

              {/* Stall interest */}
              <button
                type="button"
                onClick={() => setInterestedInStall(v => !v)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                  interestedInStall
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
                    : "bg-white/5 border-white/10 text-zinc-400 hover:border-white/20"
                }`}
              >
                <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                  interestedInStall ? "bg-amber-500 border-amber-500" : "border-zinc-600"
                }`}>
                  {interestedInStall && (
                    <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm font-medium">I&apos;m interested in setting up a vendor stall</span>
              </button>

              {/* Error */}
              {status === "error" && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm text-center">
                  {message}
                </motion.p>
              )}
            </motion.form>
          )}

          {/* Social proof */}
          {count > 0 && status !== "success" && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.1 }}
              className="text-zinc-500 text-xs"
            >
              Join <span className="text-zinc-300 font-medium">{count.toLocaleString()}</span> others already on the waitlist
            </motion.p>
          )}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-6 z-20 text-zinc-500 text-xs tracking-widest uppercase"
      >
        © {new Date().getFullYear()} BDQSocial. All rights reserved.
      </motion.div>
    </div>
  );
}
