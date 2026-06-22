"use client";

import { FestivalScene } from "@/components/motion/FestivalScene";

type Dot = {
  x: number;
  y: number;
  r: number;
  tone: "ink" | "green" | "pink" | "yellow" | "blue";
  opacity: number;
  delay: string;
};

const DOTS: Dot[] = [
  { x: 4, y: 8, r: 0.55, tone: "ink", opacity: 0.78, delay: "-1.2s" },
  { x: 9, y: 21, r: 0.35, tone: "green", opacity: 0.66, delay: "-3.8s" },
  { x: 15, y: 12, r: 0.75, tone: "blue", opacity: 0.64, delay: "-2.1s" },
  { x: 23, y: 29, r: 0.42, tone: "ink", opacity: 0.72, delay: "-5.2s" },
  { x: 31, y: 10, r: 0.58, tone: "pink", opacity: 0.65, delay: "-4.2s" },
  { x: 39, y: 35, r: 0.36, tone: "green", opacity: 0.7, delay: "-6.1s" },
  { x: 48, y: 16, r: 0.82, tone: "yellow", opacity: 0.72, delay: "-1.7s" },
  { x: 56, y: 26, r: 0.44, tone: "ink", opacity: 0.62, delay: "-2.8s" },
  { x: 63, y: 8, r: 0.5, tone: "green", opacity: 0.66, delay: "-4.8s" },
  { x: 71, y: 31, r: 0.7, tone: "blue", opacity: 0.68, delay: "-7s" },
  { x: 82, y: 13, r: 0.38, tone: "pink", opacity: 0.62, delay: "-6.5s" },
  { x: 93, y: 25, r: 0.62, tone: "ink", opacity: 0.72, delay: "-3.4s" },
  { x: 6, y: 49, r: 0.4, tone: "blue", opacity: 0.58, delay: "-6.8s" },
  { x: 18, y: 57, r: 0.62, tone: "yellow", opacity: 0.66, delay: "-2.6s" },
  { x: 27, y: 45, r: 0.32, tone: "ink", opacity: 0.72, delay: "-7.4s" },
  { x: 36, y: 61, r: 0.58, tone: "green", opacity: 0.62, delay: "-1.9s" },
  { x: 44, y: 48, r: 0.4, tone: "pink", opacity: 0.66, delay: "-5.6s" },
  { x: 53, y: 66, r: 0.7, tone: "ink", opacity: 0.58, delay: "-4.1s" },
  { x: 61, y: 52, r: 0.36, tone: "yellow", opacity: 0.72, delay: "-3.2s" },
  { x: 68, y: 71, r: 0.52, tone: "green", opacity: 0.64, delay: "-5.9s" },
  { x: 77, y: 46, r: 0.42, tone: "ink", opacity: 0.74, delay: "-2.4s" },
  { x: 89, y: 60, r: 0.8, tone: "blue", opacity: 0.58, delay: "-6.7s" },
  { x: 96, y: 74, r: 0.35, tone: "pink", opacity: 0.64, delay: "-1.4s" },
  { x: 11, y: 80, r: 0.68, tone: "green", opacity: 0.68, delay: "-4.6s" },
  { x: 21, y: 89, r: 0.36, tone: "ink", opacity: 0.7, delay: "-2.9s" },
  { x: 34, y: 78, r: 0.54, tone: "blue", opacity: 0.62, delay: "-7.2s" },
  { x: 47, y: 91, r: 0.44, tone: "yellow", opacity: 0.68, delay: "-3.7s" },
  { x: 59, y: 83, r: 0.34, tone: "ink", opacity: 0.72, delay: "-5.3s" },
  { x: 74, y: 88, r: 0.66, tone: "green", opacity: 0.6, delay: "-6.3s" },
  { x: 86, y: 82, r: 0.42, tone: "ink", opacity: 0.76, delay: "-2.2s" },
];

const toneClass = {
  ink: "market-backdrop__dot--ink",
  green: "market-backdrop__dot--green",
  pink: "market-backdrop__dot--pink",
  yellow: "market-backdrop__dot--yellow",
  blue: "market-backdrop__dot--blue",
} as const;

export function MarketBackdrop() {
  return (
    <div className="market-backdrop" aria-hidden>
      <div className="market-backdrop__image" />
      <div className="market-backdrop__wash" />
      {/* Cinematic night-market atmosphere (moon, string lights, lanterns, fireflies) behind the dots. */}
      <FestivalScene tone="gold" className="market-backdrop__scene" />
      <div className="market-backdrop__sweep market-backdrop__sweep--one" />
      <div className="market-backdrop__sweep market-backdrop__sweep--two" />
      <div className="market-backdrop__dots">
        {DOTS.map((dot, i) => (
          <span
            key={i}
            className={`market-backdrop__dot ${toneClass[dot.tone]}`}
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: `${dot.r * 2}%`,
              marginLeft: `${-dot.r}%`,
              marginTop: `${-dot.r}%`,
              opacity: dot.opacity,
              animationDelay: dot.delay,
            }}
          />
        ))}
      </div>
    </div>
  );
}
