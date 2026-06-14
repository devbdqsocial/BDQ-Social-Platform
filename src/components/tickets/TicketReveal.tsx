"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cinematic ticket reveal after payment (delight.md §1 + §3). Plays once per order
 * (`sessionStorage reveal:<id>`), only when the order is already confirmed PAID (the wallet only
 * mounts this when the ticket exists — it NEVER fakes confirmation). Navy takeover → "You're in."
 * → confetti burst → relax to the wallet. Reduced-motion: instant end state, no confetti, no haptic.
 */

const CONFETTI = ["#868EFF", "#3FA66A", "#E8B23A", "#FF58AC"];

export function TicketReveal({ orderId, eventName, admitCount }: { orderId: string; eventName: string; admitCount: number }) {
  const [show, setShow] = useState(false);
  const [reduced, setReduced] = useState(false);
  const startedRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const key = `reveal:${orderId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    const rm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduced(rm);
    setShow(true);
    startedRef.current = Date.now();
    if (!rm && navigator.vibrate) { try { navigator.vibrate(35); } catch { /* unsupported */ } }
    const t = setTimeout(() => setShow(false), rm ? 800 : 2600);
    return () => clearTimeout(t);
  }, [orderId]);

  // Confetti burst (~24 particles) at ~900ms, WAAPI, skipped under reduced motion / low memory.
  useEffect(() => {
    if (!show || reduced) return;
    const nav = navigator as Navigator & { deviceMemory?: number };
    if ((nav.deviceMemory ?? 8) < 4) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = (canvas.width = canvas.offsetWidth), H = (canvas.height = canvas.offsetHeight);
    const parts = Array.from({ length: 24 }, () => ({
      x: W / 2, y: H * 0.42, vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3,
      s: 6 + Math.random() * 4, c: CONFETTI[(Math.random() * CONFETTI.length) | 0], r: Math.random() * Math.PI,
    }));
    let raf = 0; const t0 = performance.now();
    const tick = (now: number) => {
      const e = now - t0;
      ctx.clearRect(0, 0, W, H);
      for (const p of parts) { p.vy += 0.6; p.x += p.vx; p.y += p.vy; p.r += 0.2; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s); ctx.restore(); }
      if (e < 800) raf = requestAnimationFrame(tick); else ctx.clearRect(0, 0, W, H);
    };
    const start = setTimeout(() => { raf = requestAnimationFrame(tick); }, 900);
    return () => { clearTimeout(start); cancelAnimationFrame(raf); };
  }, [show, reduced]);

  const skip = () => { if (Date.now() - startedRef.current >= 800) setShow(false); };
  if (!show) return null;

  return (
    <div
      onClick={skip}
      role="dialog"
      aria-label="Tickets confirmed"
      className="gama-1 bg-1 paint fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden text-center"
      style={{ animation: reduced ? undefined : "reveal-wipe .4s var(--ease-out, ease) both" }}
    >
      <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" />
      <span className="kicker opacity-80">You&apos;re going</span>
      <h2 className="f-exat mt-[var(--space-sm)] max-w-[14ch] f-h133" style={{ animation: reduced ? undefined : "reveal-rise .6s .3s var(--ease-bounce, ease) both" }}>You&apos;re in.</h2>
      <p className="f-paragraph mt-[var(--space-lg)] max-w-[40ch] opacity-85">
        {eventName}{admitCount > 1 ? ` · admits ${admitCount}` : ""} — your QR is in your wallet below.
      </p>
      <button type="button" onClick={() => setShow(false)} className="btn mt-[var(--space-2xl)]" data-cursor>
        <span className="btn__text">See my tickets</span>
      </button>
      <span className="kicker absolute bottom-[var(--space-xl)] opacity-50">Tap anywhere to continue</span>
    </div>
  );
}
