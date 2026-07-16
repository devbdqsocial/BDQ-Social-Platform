import { fmtDateFull } from "@/lib/date-formats";
import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { LEGAL } from "@/lib/legal";
import { pdfParagraphs, type DocSection } from "@/lib/legal-sections";

const styles = StyleSheet.create({
  page: { paddingVertical: 48, paddingHorizontal: 48, fontSize: 10, lineHeight: 1.5, fontFamily: "Helvetica", color: "#14141A" },
  brand: { fontSize: 9, color: "#5B5B66", marginBottom: 4 },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  meta: { fontSize: 8, color: "#5B5B66", marginBottom: 16 },
  heading: { fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 12, marginBottom: 4 },
  para: { marginBottom: 4, textAlign: "justify" },
  sign: { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E4E2DA" },
  signLine: { fontSize: 10, marginBottom: 2 },
  footer: { position: "absolute", bottom: 24, left: 48, right: 48, fontSize: 7, color: "#9A9AA5", textAlign: "center" },
});

/** Renders an already token-merged contract (DB template or code fallback) to PDF. */
export async function renderAgreementPdf(opts: {
  title: string;
  versionLabel: string;
  sections: DocSection[];
  brandName: string;
  signerName?: string | null;
  signedAt?: Date | null;
}): Promise<Buffer> {
  const doc = (
    <Document title={opts.title} author={LEGAL.brand}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>{LEGAL.brand}</Text>
        <Text style={styles.title}>{opts.title}</Text>
        <Text style={styles.meta}>
          {opts.versionLabel} · {LEGAL.entity}
        </Text>
        {opts.sections.map((s, i) => (
          <View key={i} wrap={false}>
            {s.heading ? <Text style={styles.heading}>{s.heading}</Text> : null}
            {pdfParagraphs(s.body).map((p, j) => (
              <Text key={j} style={styles.para}>
                {p}
              </Text>
            ))}
          </View>
        ))}
        {opts.signerName ? (
          <View style={styles.sign}>
            <Text style={styles.signLine}>Signed (electronically): {opts.signerName}</Text>
            <Text style={styles.signLine}>Brand: {opts.brandName}</Text>
            {opts.signedAt ? (
              <Text style={styles.signLine}>
                Date:{" "}
                {fmtDateFull(opts.signedAt)}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.footer} fixed>
          {LEGAL.brand} · {opts.title} · {opts.versionLabel}
        </Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
