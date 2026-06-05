/**
 * Trusted client IP. On Vercel `x-real-ip` / `x-vercel-forwarded-for` are set by the platform and
 * are NOT client-spoofable; `x-forwarded-for`'s LEFT-most hop is attacker-controlled, so we only use
 * its right-most (closest-proxy) hop as a fallback. Never key a security limit on the left-most XFF.
 */
export function clientIp(req: Request): string {
  const real = req.headers.get("x-real-ip") ?? req.headers.get("x-vercel-forwarded-for");
  if (real) return real.split(",").pop()!.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",").pop()!.trim();
  return "local";
}
