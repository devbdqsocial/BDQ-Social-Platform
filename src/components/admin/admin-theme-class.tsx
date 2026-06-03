"use client";

import { useEffect } from "react";

/**
 * Adds the `admin` class to <html> while the admin console is mounted, so Radix portals
 * (dropdowns, command palette, sheets, tooltips — appended to <body>) inherit the neutral
 * admin token scope. Removed on unmount so other zones keep the warm palette.
 */
export function AdminThemeClass() {
  useEffect(() => {
    document.documentElement.classList.add("admin");
    return () => document.documentElement.classList.remove("admin");
  }, []);
  return null;
}
