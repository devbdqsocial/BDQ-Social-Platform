/** Convert an admin-entered coupon value to the stored integer. FLAT = paise; PERCENT = 0..100. */
export function couponValueToStored(type: "FLAT" | "PERCENT", raw: number): number {
  if (type === "PERCENT") return Math.max(0, Math.min(100, Math.round(raw)));
  return Math.max(0, Math.round(raw * 100)); // rupees → paise
}
