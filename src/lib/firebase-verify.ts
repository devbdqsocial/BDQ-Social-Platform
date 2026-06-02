import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Verify a Firebase phone-auth ID token server-side WITHOUT the Admin SDK service account.
 * Firebase ID tokens are RS256 JWTs signed by Google; we verify the signature against Google's
 * public JWKS and check issuer/audience = projectId. Needs only the projectId.
 * (Docs/ARCHITECTURE.md §12.)
 */

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export interface VerifiedToken {
  uid: string;
  phone?: string;
  email?: string;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedToken> {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("Firebase projectId not configured");

  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  if (!payload.sub) throw new Error("Token missing subject");
  return {
    uid: payload.sub,
    phone: (payload.phone_number as string | undefined) ?? undefined,
    email: (payload.email as string | undefined) ?? undefined,
  };
}
