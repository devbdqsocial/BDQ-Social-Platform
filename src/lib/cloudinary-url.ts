/** Insert Cloudinary delivery transforms (auto format/quality) into an upload URL.
 *  No-op for non-Cloudinary URLs and URLs that already carry transforms. */
export function cld(url: string, width?: number): string {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  if (/\/upload\/[^/]*[fq]_auto/.test(url)) return url;
  const t = width ? `f_auto,q_auto,w_${width}` : "f_auto,q_auto";
  return url.replace("/upload/", `/upload/${t}/`);
}
