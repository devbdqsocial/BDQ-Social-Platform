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

// Raster image formats only — excludes SVG (XSS vector) and all non-image/raw types. Enforced by
// Cloudinary because `allowed_formats` is part of the signed payload and the URL pins resource_type.
const ALLOWED_FORMATS = "jpg,jpeg,png,webp";

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  allowedFormats: string;
  uploadUrl: string;
}

export function signUpload(folder: string): UploadSignature {
  if (!configured()) throw new Error("Cloudinary not configured");
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000);

  // Sign the format restriction too, so a client cannot drop it (size cap → signed upload preset).
  const signature = cloudinary.utils.api_sign_request(
    { allowed_formats: ALLOWED_FORMATS, folder, timestamp },
    apiSecret,
  );

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    allowedFormats: ALLOWED_FORMATS,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  };
}
