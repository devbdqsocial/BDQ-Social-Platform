/** Pure settlement state from the agreed fee vs the sum of recorded (APPROVED|PAID) payouts. Paise. */
export function deriveSettlement(agreedFeePaise: number, paidPaise: number): "UNPAID" | "PARTIAL" | "PAID" {
  if (paidPaise <= 0) return "UNPAID";
  if (agreedFeePaise > 0 && paidPaise >= agreedFeePaise) return "PAID";
  return "PARTIAL";
}
