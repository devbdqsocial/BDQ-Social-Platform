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

/** Server-side raw upload (e.g. a generated contract PDF buffer) → returns the secure URL. */
export async function uploadPdfBuffer(
  buffer: Buffer,
  folder: string,
  publicId: string,
): Promise<{ url: string; publicId: string }> {
  if (!configured()) throw new Error("Cloudinary not configured");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
    secure: true,
  });
  const dataUri = `data:application/pdf;base64,${buffer.toString("base64")}`;
  const res = await cloudinary.uploader.upload(dataUri, {
    folder,
    public_id: publicId,
    resource_type: "raw",
    format: "pdf",
    overwrite: true,
  });
  return { url: res.secure_url, publicId: res.public_id };
}

export function signUpload(folder: string, opts?: { allowPdf?: boolean }): UploadSignature {
  if (!configured()) throw new Error("Cloudinary not configured");
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000);
  // KYC docs may be PDFs (Cloudinary serves PDF under the image resource type); brand assets stay raster-only.
  const allowedFormats = opts?.allowPdf ? `${ALLOWED_FORMATS},pdf` : ALLOWED_FORMATS;

  // Sign the format restriction too, so a client cannot drop it (size cap → signed upload preset).
  const signature = cloudinary.utils.api_sign_request(
    { allowed_formats: allowedFormats, folder, timestamp },
    apiSecret,
  );

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
    allowedFormats,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  };
}
