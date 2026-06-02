import "server-only";
import { v2 as cloudinary } from "cloudinary";

/**
 * Cloudinary signed direct upload (ARCHITECTURE §16). The server mints a signature; the client
 * uploads the file straight to Cloudinary, so large payloads never pass through our functions.
 * api_secret stays server-side; cloud name + api_key returned to the client are non-secret.
 */

function configured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  uploadUrl: string;
}

export function signUpload(folder: string): UploadSignature {
  if (!configured()) throw new Error("Cloudinary not configured");
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret);

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
  };
}
