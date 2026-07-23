import { pdf } from "@react-pdf/renderer";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  buildPdfData,
  SalesOrderPdfDocument,
  type SalesOrderPdfData,
} from "@/components/SalesOrderPdf";
import { GOLDEN_FRESH_LOGO_DATA_URL } from "@/assets/golden-fresh-logo-data";
import type { OrderItemRow, OrderRow } from "@/lib/queries";

export const ORDER_PDF_BUCKET = "order-pdfs";

export function orderPdfObjectPath(userId: string, orderId: string) {
  return `${userId}/${orderId}.pdf`;
}

export function orderPdfFileName(documentNumber: string) {
  return `OrderRequisition-${documentNumber}.pdf`;
}

export async function generatePdfBlob(data: SalesOrderPdfData): Promise<Blob> {
  return pdf(
    <SalesOrderPdfDocument
      data={{ ...data, logoSrc: data.logoSrc ?? GOLDEN_FRESH_LOGO_DATA_URL }}
    />,
  ).toBlob();
}

export function pdfDataFromOrder(order: OrderRow, items: OrderItemRow[]): SalesOrderPdfData {
  return buildPdfData({
    document_number: order.document_number,
    order_date: order.order_date,
    customer_name: order.customer_name,
    delivery_address: order.delivery_address,
    account_code: order.account_code,
    reference: order.reference,
    order_by: order.sales_code,
    items: items.map((it) => ({
      product_code: it.product_code,
      product_description: it.product_description,
      quantity: it.quantity,
      product_unit: "",
      price: it.price,
    })),
  });
}

export async function uploadOrderPdf(
  userId: string,
  orderId: string,
  blob: Blob,
): Promise<string> {
  const path = orderPdfObjectPath(userId, orderId);
  const { error } = await supabase.storage.from(ORDER_PDF_BUCKET).upload(path, blob, {
    contentType: "application/pdf",
    upsert: true,
  });
  if (error) throw error;

  const { error: updateErr } = await supabase
    .from("orders")
    .update({ pdf_path: path })
    .eq("id", orderId);
  if (updateErr) throw updateErr;

  return path;
}

/** Delete order row (cascades items) and best-effort remove stored PDF. */
export async function deleteOrderWithPdf(order: {
  id: string;
  pdf_path: string | null;
}): Promise<void> {
  if (order.pdf_path) {
    const { error: storageErr } = await supabase.storage
      .from(ORDER_PDF_BUCKET)
      .remove([order.pdf_path]);
    if (storageErr) {
      console.warn("[pdf] storage delete failed", storageErr.message);
    }
  }

  const { error } = await supabase.from("orders").delete().eq("id", order.id);
  if (error) throw error;
}

export async function downloadBlobAsFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Always regenerate from current data so layout updates apply. */
export async function resolveOrderPdfBlob(
  order: OrderRow,
  items: OrderItemRow[],
): Promise<Blob> {
  return generatePdfBlob(pdfDataFromOrder(order, items));
}

export async function shareOrDownloadPdf(opts: {
  blob: Blob;
  documentNumber: string;
  customerName?: string;
}): Promise<"shared" | "downloaded" | "cancelled"> {
  const fileName = orderPdfFileName(opts.documentNumber);
  const file = new File([opts.blob], fileName, { type: "application/pdf" });
  const title = `Order Requisition ${opts.documentNumber}`;
  const text = opts.customerName
    ? `Order Requisition ${opts.documentNumber} — ${opts.customerName}`
    : title;

  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
  };

  const tryShare = async (data: ShareData) => {
    if (typeof nav.share !== "function") return false;
    if (nav.canShare && !nav.canShare(data)) return false;
    await nav.share(data);
    return true;
  };

  try {
    if (await tryShare({ files: [file], title, text })) {
      return "shared";
    }
  } catch (e: unknown) {
    if (e instanceof Error && e.name === "AbortError") {
      return "cancelled";
    }
    // NotAllowedError / "Permission denied" often happens after async PDF prep
    // (user gesture expired). Fall through to download.
    console.warn("[share]", e);
  }

  await downloadBlobAsFile(opts.blob, fileName);
  toast.message("Couldn’t open the share sheet — PDF downloaded instead.");
  return "downloaded";
}
