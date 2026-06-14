import type { HomeMode } from "@/lib/home-mode";

/**
 * Home lifecycle focus (customer-portal §3.1, R3.10). Pure mapping from the time-based `HomeMode`
 * to the home's emphasis — same page, same nav, same design; only the focus shifts as the festival
 * moves PRE → LIVE → POST. Drives the hero kicker, CTAs, countdown, and the closing band.
 */

export interface HomeAction { href: string; label: string }

export interface HomeFocus {
  kicker: string;
  primary: HomeAction;
  secondary: HomeAction[];
  showCountdown: boolean;
  showTicketPrice: boolean;
  closing: { heading: (eventName: string) => string; action: HomeAction };
}

export function homeFocus(mode: HomeMode): HomeFocus {
  switch (mode) {
    case "LIVE":
      return {
        kicker: "We're live tonight",
        primary: { href: "/schedule", label: "What's on now" },
        secondary: [{ href: "/map", label: "Explore the map" }, { href: "/offers", label: "Tonight's offers" }],
        showCountdown: false,
        showTicketPrice: false,
        closing: { heading: (e) => `${e} is on right now`, action: { href: "/schedule", label: "See what's on" } },
      };
    case "POST":
      return {
        kicker: "That's a wrap",
        primary: { href: "/gallery", label: "Relive the night" },
        secondary: [{ href: "/vendors", label: "Meet the brands" }, { href: "/events", label: "The next one" }],
        showCountdown: false,
        showTicketPrice: false,
        closing: { heading: () => "Until the next one", action: { href: "/gallery", label: "See the gallery" } },
      };
    default: // PRE
      return {
        kicker: "Curated night market",
        primary: { href: "/events", label: "Get tickets" },
        secondary: [{ href: "/vendors", label: "Meet the brands" }],
        showCountdown: true,
        showTicketPrice: true,
        closing: { heading: (e) => `Don't miss ${e}`, action: { href: "/events", label: "Get tickets" } },
      };
  }
}
