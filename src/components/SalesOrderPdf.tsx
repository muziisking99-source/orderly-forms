import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  pdf,
} from "@react-pdf/renderer";
import { BRAND, COMPANY, formatDisplayDate } from "@/lib/brand";
import { GOLDEN_FRESH_LOGO_DATA_URL } from "@/assets/golden-fresh-logo-data";

Font.register({
  family: "AbrilFatface",
  src: "https://cdn.jsdelivr.net/fontsource/fonts/abril-fatface@latest/latin-400-normal.ttf",
});

Font.register({
  family: "NunitoPdf",
  fonts: [
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/nunito@latest/latin-400-normal.ttf",
      fontWeight: 400,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/nunito@latest/latin-600-normal.ttf",
      fontWeight: 600,
    },
    {
      src: "https://cdn.jsdelivr.net/fontsource/fonts/nunito@latest/latin-700-normal.ttf",
      fontWeight: 700,
    },
  ],
});

export type SalesOrderPdfData = {
  documentNumber: string;
  orderDate: string;
  customerName: string;
  deliveryAddress: string | null;
  accountCode: string | null;
  reference: string | null;
  orderBy: string | null;
  items: {
    code: string;
    description: string;
    quantity: string;
  }[];
  logoSrc?: string;
};

const NAVY = BRAND.navy;
const GOLD = BRAND.gold;
const RED = BRAND.red;
const INK = "#141414";
const MUTED = "#5A5A5A";
const RULE = "#C8C4BA";
const RULE_SOFT = "#E6E2D8";
const PAPER = "#FFFFFF";
const STRIPE = "#F7F5F0";

const s = StyleSheet.create({
  page: {
    paddingTop: 0,
    paddingBottom: 48,
    paddingHorizontal: 0,
    fontFamily: "NunitoPdf",
    fontSize: 9,
    color: INK,
    backgroundColor: PAPER,
  },
  headerBand: {
    backgroundColor: NAVY,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 36,
    alignItems: "flex-start",
  },
  logo: {
    width: 88,
    height: 64,
    marginBottom: 10,
  },
  letterheadLine: {
    fontSize: 8.5,
    color: "#E8ECF2",
    lineHeight: 1.5,
  },
  letterheadEmail: {
    fontSize: 8.5,
    color: "#FFFFFF",
    fontWeight: 700,
    marginTop: 4,
  },
  goldStripe: {
    height: 3,
    backgroundColor: GOLD,
  },
  redAccent: {
    height: 1.5,
    backgroundColor: RED,
  },
  body: {
    paddingHorizontal: 36,
    paddingTop: 18,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginBottom: 16,
  },
  titleLeft: {
    justifyContent: "center",
    flex: 1,
    paddingRight: 12,
  },
  docEyebrow: {
    fontSize: 7,
    fontWeight: 700,
    color: RED,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  docTitle: {
    fontFamily: "AbrilFatface",
    fontSize: 22,
    color: NAVY,
    letterSpacing: 0.3,
  },
  metaBox: {
    width: 168,
    borderWidth: 1,
    borderColor: NAVY,
    backgroundColor: STRIPE,
  },
  metaBoxRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: RULE_SOFT,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  metaBoxRowLast: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  metaBoxLabel: {
    width: 72,
    fontSize: 6.5,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metaBoxValue: {
    flex: 1,
    fontSize: 8.5,
    fontWeight: 700,
    color: NAVY,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  deliverCard: {
    flex: 1.4,
    borderWidth: 1,
    borderColor: RULE,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 78,
    marginRight: 12,
  },
  sectionLabel: {
    fontSize: 6.5,
    fontWeight: 700,
    color: RED,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 5,
  },
  customerName: {
    fontSize: 11,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 3,
  },
  address: {
    fontSize: 8.5,
    color: INK,
    lineHeight: 1.4,
  },
  codesStack: {
    flex: 1,
    borderWidth: 1,
    borderColor: RULE,
  },
  codeCell: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: RULE_SOFT,
    justifyContent: "center",
  },
  codeCellLast: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  codeLabel: {
    fontSize: 6.5,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  codeValue: {
    fontSize: 10,
    fontWeight: 700,
    color: NAVY,
  },
  table: {
    borderWidth: 1,
    borderColor: NAVY,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 7,
    paddingHorizontal: 0,
  },
  th: {
    color: "#FFFFFF",
    fontSize: 7,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderBottomColor: RULE,
    minHeight: 24,
    alignItems: "center",
  },
  rowAlt: {
    backgroundColor: STRIPE,
  },
  rowBlank: {
    minHeight: 26,
  },
  cell: {
    fontSize: 8.5,
    color: INK,
    paddingVertical: 5,
  },
  cellPadL: { paddingLeft: 8 },
  cellPadR: { paddingRight: 8 },
  colCode: { width: "18%" },
  colDesc: { width: "58%" },
  colQty: { width: "24%", textAlign: "right" },
  thCode: { width: "18%", paddingLeft: 8 },
  thDesc: { width: "58%", paddingLeft: 8 },
  thQty: { width: "24%", textAlign: "right", paddingRight: 8 },
  footer: {
    marginTop: 28,
    borderTopWidth: 1.5,
    borderTopColor: NAVY,
    paddingTop: 12,
  },
  footerTitle: {
    fontSize: 9.5,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 18,
  },
  signRow: {
    flexDirection: "row",
  },
  signCol: {
    width: "42%",
    marginRight: "8%",
  },
  signLine: {
    borderBottomWidth: 1,
    borderBottomColor: INK,
    height: 22,
    marginBottom: 4,
  },
  signLabel: {
    fontSize: 6.5,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  pageFooter: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.75,
    borderTopColor: RULE,
    paddingTop: 6,
  },
  pageFooterText: {
    fontSize: 6.5,
    color: MUTED,
  },
  pageFooterReg: {
    fontSize: 6.5,
    color: MUTED,
    textAlign: "right",
  },
});

function padItems(items: SalesOrderPdfData["items"], min = 6) {
  const rows = [...items];
  while (rows.length < min) {
    rows.push({ code: "", description: "", quantity: "" });
  }
  return rows;
}

export function SalesOrderPdfDocument({ data }: { data: SalesOrderPdfData }) {
  const rows = padItems(data.items);
  const filledCount = data.items.length;

  return (
    <Document title={`Order Requisition ${data.documentNumber}`} author={COMPANY.brandName}>
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <Image src={data.logoSrc ?? GOLDEN_FRESH_LOGO_DATA_URL} style={s.logo} />
          <Text style={s.letterheadLine}>{COMPANY.address}</Text>
          <Text style={s.letterheadLine}>Tel: {COMPANY.tel}</Text>
          <Text style={s.letterheadEmail}>{COMPANY.salesEmail}</Text>
        </View>
        <View style={s.goldStripe} />
        <View style={s.redAccent} />

        <View style={s.body}>
          <View style={s.titleRow}>
            <View style={s.titleLeft}>
              <Text style={s.docEyebrow}>Official document</Text>
              <Text style={s.docTitle}>Order Requisition</Text>
            </View>
            <View style={s.metaBox}>
              <View style={s.metaBoxRow}>
                <Text style={s.metaBoxLabel}>Document</Text>
                <Text style={s.metaBoxValue}>{data.documentNumber}</Text>
              </View>
              <View style={s.metaBoxRow}>
                <Text style={s.metaBoxLabel}>Date</Text>
                <Text style={s.metaBoxValue}>{formatDisplayDate(data.orderDate)}</Text>
              </View>
              <View style={s.metaBoxRowLast}>
                <Text style={s.metaBoxLabel}>Page</Text>
                <Text style={s.metaBoxValue}>1 of 1</Text>
              </View>
            </View>
          </View>

          <View style={s.infoRow}>
            <View style={s.deliverCard}>
              <Text style={s.sectionLabel}>Deliver to</Text>
              <Text style={s.customerName}>{data.customerName}</Text>
              <Text style={s.address}>{data.deliveryAddress || "—"}</Text>
            </View>
            <View style={s.codesStack}>
              <View style={s.codeCell}>
                <Text style={s.codeLabel}>Account Code</Text>
                <Text style={s.codeValue}>{data.accountCode || "—"}</Text>
              </View>
              <View style={s.codeCell}>
                <Text style={s.codeLabel}>Your Reference</Text>
                <Text style={s.codeValue}>{data.reference || "—"}</Text>
              </View>
              <View style={s.codeCellLast}>
                <Text style={s.codeLabel}>Order By</Text>
                <Text style={s.codeValue}>{data.orderBy || "—"}</Text>
              </View>
            </View>
          </View>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, s.thCode]}>Code</Text>
              <Text style={[s.th, s.thDesc]}>Description</Text>
              <Text style={[s.th, s.thQty]}>Quantity</Text>
            </View>
            {rows.map((it, i) => {
              const isBlank = i >= filledCount;
              const isAlt = !isBlank && i % 2 === 1;
              const rowStyle = isBlank ? [s.row, s.rowBlank] : isAlt ? [s.row, s.rowAlt] : [s.row];
              return (
                <View key={i} style={rowStyle} wrap={false}>
                  <Text style={[s.cell, s.colCode, s.cellPadL]}>{it.code}</Text>
                  <Text style={[s.cell, s.colDesc, s.cellPadL]}>{it.description}</Text>
                  <Text style={[s.cell, s.colQty, s.cellPadR]}>{it.quantity}</Text>
                </View>
              );
            })}
          </View>

          <View style={s.footer}>
            <Text style={s.footerTitle}>Received in good order</Text>
            <View style={s.signRow}>
              <View style={s.signCol}>
                <View style={s.signLine} />
                <Text style={s.signLabel}>Signed</Text>
              </View>
              <View style={s.signCol}>
                <View style={s.signLine} />
                <Text style={s.signLabel}>Date</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={s.pageFooter} fixed>
          <Text style={s.pageFooterText}>
            {COMPANY.brandName}  ·  {COMPANY.legalName}
          </Text>
          <Text style={s.pageFooterReg}>
            CK {COMPANY.ckNo}  ·  VAT {COMPANY.vatNo}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

export async function downloadSalesOrderPdf(data: SalesOrderPdfData) {
  const blob = await pdf(
    <SalesOrderPdfDocument
      data={{ ...data, logoSrc: data.logoSrc ?? GOLDEN_FRESH_LOGO_DATA_URL }}
    />,
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `OrderRequisition-${data.documentNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildPdfData(input: {
  document_number: string;
  order_date: string;
  customer_name: string;
  delivery_address: string | null;
  account_code: string | null;
  reference: string | null;
  order_by: string | null;
  items: {
    product_code: string;
    product_description: string;
    quantity: string;
    product_unit: string;
  }[];
}): SalesOrderPdfData {
  return {
    documentNumber: input.document_number,
    orderDate: input.order_date,
    customerName: input.customer_name,
    deliveryAddress: input.delivery_address,
    accountCode: input.account_code,
    reference: input.reference,
    orderBy: input.order_by,
    items: input.items.map((it) => ({
      code: it.product_code,
      description: it.product_description,
      quantity: it.quantity,
    })),
  };
}
