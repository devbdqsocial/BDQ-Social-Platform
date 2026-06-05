import { generateSecret as genSecret, generateSync, verifySync } from "otplib";

/** TOTP for SUPER_ADMIN 2FA (Docs/project.md §3, BUSINESS-RULES §6). otplib v13 functional API. */

export function generateSecret(): string {
  return genSecret();
}

export function verifyCode(token: string, secret: string): boolean {
  // ±1 step (30s) clock-skew tolerance. otplib v13 defaults to epochTolerance:0, which accepts ONLY
  // the exact current step — rejecting codes typed a moment late or with minor device clock drift.
  return verifySync({ token, secret, epochTolerance: 30 }).valid;
}

export function otpauthUrl(account: string, secret: string, issuer = "BDQSocial"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

/** Current code for a secret — used only in tests/enrolment helpers. */
export function currentCode(secret: string): string {
  return generateSync({ secret });
}
