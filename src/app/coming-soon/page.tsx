"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { joinPlatformWaitlist } from "@/actions/waitlist";

export default function ComingSoonPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  // Target Date for the countdown
  const targetDate = new Date("2026-10-01T12:00:00").getTime();

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance < 0) {
        clearInterval(interval);
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    const formData = new FormData(e.currentTarget);
    const result = await joinPlatformWaitlist(formData);

    if (result.error) {
      setStatus("error");
      setMessage(result.error);
    } else {
      setStatus("success");
      setMessage("You're on the list! We'll notify you on WhatsApp.");
      (e.target as HTMLFormElement).reset();
    }
  };

  return (
    <div className="relative font-sans min-h-screen flex flex-col items-center justify-center bg-black text-white overflow-hidden">
      {/* Background Image / Gradient */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/90 z-10" />
        {/* Background Image from user */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-[center_top_20%] bg-no-repeat opacity-100"
          style={{ backgroundImage: "url('/assets/coming-soon/coming-soon-bg-comp.png')" }}
        />
        {/* Animated glowing orbs for premium feel */}
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

      {/* Main Content Glassmorphism Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="z-20 w-full max-w-2xl p-8 md:p-12 mx-4 rounded-3xl backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl"
      >
        <div className="text-center space-y-6">
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
            className="text-base sm:text-lg md:text-xl text-zinc-200 max-w-lg mx-auto font-medium"
          >
            Get ready to be social. Join the exclusive waitlist to secure early access and receive updates directly on WhatsApp.
          </motion.p>

          {/* Countdown Timer */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 }}
            className="grid grid-cols-4 gap-2 sm:gap-3 md:gap-4 py-6 max-w-md mx-auto w-full px-1"
          >
            {[
              { label: "Days", value: timeLeft.days },
              { label: "Hours", value: timeLeft.hours },
              { label: "Minutes", value: timeLeft.minutes },
              { label: "Seconds", value: timeLeft.seconds },
            ].map((unit, idx) => (
              <div key={idx} className="flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl bg-black/60 backdrop-blur-md border border-white/10 shadow-inner">
                <span className="text-xl sm:text-3xl md:text-4xl font-bold tabular-nums text-white">{String(unit.value).padStart(2, "0")}</span>
                <span className="text-[10px] sm:text-xs text-zinc-300 font-medium uppercase tracking-wider mt-1">{unit.label}</span>
              </div>
            ))}
          </motion.div>

          {/* Form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            onSubmit={handleSubmit}
            className="max-w-md mx-auto w-full relative"
          >
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="tel"
                name="phone"
                placeholder="WhatsApp Number"
                required
                disabled={status === "loading" || status === "success"}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={status === "loading" || status === "success"}
                className="bg-white text-black font-semibold rounded-xl px-8 py-4 hover:bg-zinc-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
              >
                {status === "loading" ? "Joining..." : "Get Updates"}
              </button>
            </div>

            {/* Status Message */}
            <div className="h-8 mt-4 flex items-center justify-center">
              {status === "success" && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-green-400 text-sm font-medium">
                  {message}
                </motion.p>
              )}
              {status === "error" && (
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm font-medium">
                  {message}
                </motion.p>
              )}
            </div>
          </motion.form>
        </div>
      </motion.div>

      {/* Footer minimal text */}
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
