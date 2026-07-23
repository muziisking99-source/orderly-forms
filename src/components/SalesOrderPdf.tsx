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
import { BRAND, COMPANY, PALLET_CONFIGURATION, formatDisplayDate } from "@/lib/brand";
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
    price?: string | null;
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
    paddingBottom: 148,
    paddingHorizontal: 0,
    fontFamily: "NunitoPdf",
    fontSize: 9,
    color: INK,
    backgroundColor: PAPER,
  },
  headerBand: {
    backgroundColor: PAPER,
    paddingTop: 14,
    paddingBottom: 12,
    paddingHorizontal: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    width: 110,
    height: 80,
  },
  letterheadRight: {
    flex: 1,
    alignItems: "flex-end",
    paddingLeft: 16,
  },
  letterheadLine: {
    fontSize: 8,
    color: MUTED,
    lineHeight: 1.4,
    textAlign: "right",
  },
  letterheadEmail: {
    fontSize: 8,
    color: NAVY,
    fontWeight: 700,
    marginTop: 3,
    textAlign: "right",
  },
  goldStripe: {
    height: 2.5,
    backgroundColor: GOLD,
  },
  redAccent: {
    height: 1.25,
    backgroundColor: RED,
  },
  body: {
    paddingHorizontal: 28,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "stretch",
    marginBottom: 10,
  },
  titleLeft: {
    justifyContent: "center",
    flex: 1,
    paddingRight: 10,
  },
  docEyebrow: {
    fontSize: 6.5,
    fontWeight: 700,
    color: RED,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  docTitle: {
    fontFamily: "AbrilFatface",
    fontSize: 18,
    color: NAVY,
    letterSpacing: 0.3,
  },
  metaBox: {
    width: 148,
    borderWidth: 1,
    borderColor: NAVY,
    backgroundColor: STRIPE,
  },
  metaBoxRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: RULE_SOFT,
    paddingVertical: 3.5,
    paddingHorizontal: 7,
  },
  metaBoxRowLast: {
    flexDirection: "row",
    paddingVertical: 3.5,
    paddingHorizontal: 7,
  },
  metaBoxLabel: {
    width: 64,
    fontSize: 6,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metaBoxValue: {
    flex: 1,
    fontSize: 8,
    fontWeight: 700,
    color: NAVY,
    textAlign: "right",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  deliverCard: {
    flex: 1.4,
    borderWidth: 1,
    borderColor: RULE,
    paddingVertical: 6,
    paddingHorizontal: 9,
    marginRight: 10,
  },
  sectionLabel: {
    fontSize: 6,
    fontWeight: 700,
    color: RED,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  customerName: {
    fontSize: 10,
    fontWeight: 700,
    color: NAVY,
    marginBottom: 2,
  },
  address: {
    fontSize: 8,
    color: INK,
    lineHeight: 1.3,
  },
  codesStack: {
    flex: 1,
    borderWidth: 1,
    borderColor: RULE,
  },
  codeCell: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderBottomWidth: 1,
    borderBottomColor: RULE_SOFT,
    justifyContent: "center",
  },
  codeCellLast: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    justifyContent: "center",
  },
  codeLabel: {
    fontSize: 6,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  codeValue: {
    fontSize: 9,
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
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  th: {
    color: "#FFFFFF",
    fontSize: 6.5,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 0.6,
    borderBottomColor: RULE,
    minHeight: 16,
    alignItems: "center",
  },
  rowAlt: {
    backgroundColor: STRIPE,
  },
  rowBlank: {
    minHeight: 16,
  },
  cell: {
    fontSize: 8,
    color: INK,
    paddingVertical: 2.5,
  },
  cellPadL: { paddingLeft: 6 },
  cellPadR: { paddingRight: 6 },
  colCode: { width: "18%" },
  colDesc: { width: "58%" },
  colQty: { width: "24%", textAlign: "right" },
  thCode: { width: "18%", paddingLeft: 6 },
  thDesc: { width: "58%", paddingLeft: 6 },
  thQty: { width: "24%", textAlign: "right", paddingRight: 6 },
  colCodeWithPrice: { width: "16%" },
  colDescWithPrice: { width: "48%" },
  colQtyWithPrice: { width: "18%", textAlign: "right" },
  colPrice: { width: "18%", textAlign: "right" },
  thCodeWithPrice: { width: "16%", paddingLeft: 6 },
  thDescWithPrice: { width: "48%", paddingLeft: 6 },
  thQtyWithPrice: { width: "18%", textAlign: "right", paddingRight: 6 },
  thPrice: { width: "18%", textAlign: "right", paddingRight: 6 },
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
    bottom: 12,
    left: 28,
    right: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 0.75,
    borderTopColor: RULE,
    paddingTop: 4,
  },
  pageFooterText: {
    fontSize: 6,
    color: MUTED,
  },
  pageFooterReg: {
    fontSize: 6,
    color: MUTED,
    textAlign: "right",
  },
  palletFixed: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 34,
  },
  palletWrap: {
    borderWidth: 1,
    borderColor: INK,
  },
  palletHeader: {
    backgroundColor: PAPER,
    borderBottomWidth: 1,
    borderBottomColor: INK,
    paddingVertical: 3,
    alignItems: "center",
  },
  palletHeaderText: {
    fontSize: 7,
    fontWeight: 700,
    color: INK,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  palletRow: {
    flexDirection: "row",
    borderBottomWidth: 0.75,
    borderBottomColor: INK,
  },
  palletRowLast: {
    flexDirection: "row",
  },
  palletProduct: {
    width: "34%",
    fontSize: 6,
    color: INK,
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    borderRightWidth: 0.75,
    borderRightColor: INK,
    textTransform: "uppercase",
  },
  palletQty: {
    width: "16%",
    fontSize: 6,
    color: INK,
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    borderRightWidth: 0.75,
    borderRightColor: INK,
    textTransform: "uppercase",
  },
  palletQtyLast: {
    width: "16%",
    fontSize: 6,
    color: INK,
    paddingVertical: 2.5,
    paddingHorizontal: 4,
    textTransform: "uppercase",
  },
});

function padItems(items: SalesOrderPdfData["items"], min = 0) {
  const rows = [...items];
  while (rows.length < min) {
    rows.push({ code: "", description: "", quantity: "", price: "" });
  }
  return rows;
}

function hasAnyPrice(items: SalesOrderPdfData["items"]) {
  return items.some((it) => (it.price ?? "").trim() !== "");
}

export function SalesOrderPdfDocument({ data }: { data: SalesOrderPdfData }) {
  const rows = padItems(data.items);
  const filledCount = data.items.length;
  const showPrice = hasAnyPrice(data.items);

  return (
    <Document title={`Order Requisition ${data.documentNumber}`} author={COMPANY.brandName}>
      <Page size="A4" style={s.page}>
        <View style={s.headerBand}>
          <Image src={data.logoSrc ?? GOLDEN_FRESH_LOGO_DATA_URL} style={s.logo} />
          <View style={s.letterheadRight}>
            <Text style={s.letterheadLine}>{COMPANY.address}</Text>
            <Text style={s.letterheadLine}>Tel: {COMPANY.tel}</Text>
            <Text style={s.letterheadEmail}>{COMPANY.salesEmail}</Text>
          </View>
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
              <View style={s.codeCellLast}>
                <Text style={s.codeLabel}>Order By</Text>
                <Text style={s.codeValue}>{data.orderBy || "—"}</Text>
              </View>
            </View>
          </View>

          <View style={s.table}>
            <View style={s.tableHeader}>
              <Text style={[s.th, showPrice ? s.thCodeWithPrice : s.thCode]}>Code</Text>
              <Text style={[s.th, showPrice ? s.thDescWithPrice : s.thDesc]}>Description</Text>
              <Text style={[s.th, showPrice ? s.thQtyWithPrice : s.thQty]}>Quantity</Text>
              {showPrice ? <Text style={[s.th, s.thPrice]}>Price</Text> : null}
            </View>
            {rows.map((it, i) => {
              const isBlank = i >= filledCount;
              const isAlt = !isBlank && i % 2 === 1;
              const rowStyle = isBlank ? [s.row, s.rowBlank] : isAlt ? [s.row, s.rowAlt] : [s.row];
              return (
                <View key={i} style={rowStyle} wrap={false}>
                  <Text style={[s.cell, showPrice ? s.colCodeWithPrice : s.colCode, s.cellPadL]}>
                    {it.code}
                  </Text>
                  <Text style={[s.cell, showPrice ? s.colDescWithPrice : s.colDesc, s.cellPadL]}>
                    {it.description}
                  </Text>
                  <Text style={[s.cell, showPrice ? s.colQtyWithPrice : s.colQty, s.cellPadR]}>
                    {it.quantity}
                  </Text>
                  {showPrice ? (
                    <Text style={[s.cell, s.colPrice, s.cellPadR]}>{it.price ?? ""}</Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.palletFixed} fixed>
          <View style={s.palletWrap}>
            <View style={s.palletHeader}>
              <Text style={s.palletHeaderText}>Pallet Configuration</Text>
            </View>
            {PALLET_CONFIGURATION.map((pair, i) => {
              const isLast = i === PALLET_CONFIGURATION.length - 1;
              const left = pair[0] ?? { product: "", qty: "" };
              const right = pair[1] ?? { product: "", qty: "" };
              return (
                <View key={i} style={isLast ? s.palletRowLast : s.palletRow}>
                  <Text style={s.palletProduct}>{left.product}</Text>
                  <Text style={s.palletQty}>{left.qty}</Text>
                  <Text style={s.palletProduct}>{right.product}</Text>
                  <Text style={s.palletQtyLast}>{right.qty}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.pageFooter} fixed>
          <Text style={s.pageFooterText}>
            {COMPANY.brandName}  ·  {COMPANY.legalName}
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
    price?: string | null;
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
      price: it.price ?? null,
    })),
  };
}
