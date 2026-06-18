/**
 * Renders schema.org JSON-LD. `type="application/ld+json"` is a non-executable data block, so the
 * strict CSP `script-src` does not apply — no nonce is needed (and omitting `headers()` keeps this
 * usable inside static/ISR routes without forcing dynamic rendering). `<` is escaped to block
 * `</script>` breakouts from any user-entered field (event name/description).
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
