import { v2 as cloudinary } from "cloudinary";

// Proves the Cloudinary signed-direct-upload path with the real keys (mirrors src/lib/cloudinary.ts
// + the client uploader). Run: node --env-file=.env scripts/verify-cloudinary.mjs

const cloud = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;
if (!cloud || !apiKey || !apiSecret) throw new Error("Cloudinary env not set");

const folder = "bdq/vendors/logo";
const timestamp = Math.floor(Date.now() / 1000);
const signature = cloudinary.utils.api_sign_request({ folder, timestamp }, apiSecret);

// 1x1 transparent PNG
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);

const fd = new FormData();
fd.append("file", new Blob([png], { type: "image/png" }), "test.png");
fd.append("api_key", apiKey);
fd.append("timestamp", String(timestamp));
fd.append("signature", signature);
fd.append("folder", folder);

const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/auto/upload`, {
  method: "POST",
  body: fd,
});
const json = await res.json();
if (!res.ok || !json.secure_url) {
  console.error("FAIL:", JSON.stringify(json));
  process.exit(1);
}
console.log("OK uploaded:", json.secure_url);

cloudinary.config({ cloud_name: cloud, api_key: apiKey, api_secret: apiSecret });
await cloudinary.uploader.destroy(json.public_id);
console.log("cleaned up:", json.public_id);
