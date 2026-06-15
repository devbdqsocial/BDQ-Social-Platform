/** Vendor call-back review SLA (vendor-portal §3 / admin-portal §3.4): the team promises to call
 *  back within 48h of a vendor signing. Past that, the application is "overdue" — surfaced to admin
 *  as an aging tile and softened in the vendor's own wait copy. */

export const REVIEW_SLA_HOURS = 48;
export const REVIEW_SLA_MS = REVIEW_SLA_HOURS * 60 * 60 * 1000;

/** True once a signed-and-waiting vendor has passed the call-back SLA. Null signedAt = not waiting. */
export function isReviewOverdue(signedAt: Date | null | undefined, now: Date = new Date()): boolean {
  return signedAt != null && now.getTime() - signedAt.getTime() > REVIEW_SLA_MS;
}
