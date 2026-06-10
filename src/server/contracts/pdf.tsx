import "server-only";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { LEGAL } from "@/lib/legal";
import { agreementSections, CONTRACT_VERSION, type AgreementContext } from "./agreement";

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

export async function renderVendorAgreementPdf(ctx: AgreementContext): Promise<Buffer> {
  const sections = agreementSections(ctx);
  const doc = (
    <Document title="Vendor Participation Agreement" author={LEGAL.brand}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.brand}>{LEGAL.brand}</Text>
        <Text style={styles.title}>Vendor Participation Agreement</Text>
        <Text style={styles.meta}>
          {CONTRACT_VERSION} · {LEGAL.entity}
        </Text>
        {sections.map((s, i) => (
          <View key={i} wrap={false}>
            <Text style={styles.heading}>{s.heading}</Text>
            {s.body.map((p, j) => (
              <Text key={j} style={styles.para}>
                {p}
              </Text>
            ))}
          </View>
        ))}
        {ctx.signerName ? (
          <View style={styles.sign}>
            <Text style={styles.signLine}>Signed (electronically): {ctx.signerName}</Text>
            <Text style={styles.signLine}>Brand: {ctx.brandName}</Text>
            {ctx.signedAt ? (
              <Text style={styles.signLine}>
                Date:{" "}
                {new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(ctx.signedAt)}
              </Text>
            ) : null}
          </View>
        ) : null}
        <Text style={styles.footer} fixed>
          {LEGAL.brand} · Vendor Participation Agreement · {CONTRACT_VERSION}
        </Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
