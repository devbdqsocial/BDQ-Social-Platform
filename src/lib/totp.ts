import { generateSecret as genSecret, generateSync, verifySync } from "otplib";

/** TOTP for SUPER_ADMIN 2FA (Docs/project.md §3, BUSINESS-RULES §6). otplib v13 functional API. */

export function generateSecret(): string {
  return genSecret();
}

export function verifyCode(token: string, secret: string): boolean {
  return verifySync({ token, secret }).valid;
}

export function otpauthUrl(account: string, secret: string, issuer = "BDQSocial"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
}

/** Current code for a secret — used only in tests/enrolment helpers. */
export function currentCode(secret: string): string {
  return generateSync({ secret });
}
