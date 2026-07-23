import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";

import { requireSession, useAuth } from "@/lib/auth";
import { fetchOrder, fetchOrderItems, queryKeys } from "@/lib/queries";
import {
  downloadBlobAsFile,
  orderPdfFileName,
  resolveOrderPdfBlob,
  shareOrDownloadPdf,
  uploadOrderPdf,
} from "@/lib/order-pdf";
import { SalesOrderDocument } from "@/components/SalesOrderDocument";
import { DocumentSkeleton } from "@/components/loading/DocumentSkeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orders/$id")({
  beforeLoad: () => requireSession(),
  component: SalesOrderPage,
});

function SalesOrderPage() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [busy, setBusy] = useState<"download" | "share" | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const pdfBlobRef = useRef<Blob | null>(null);

  const orderQuery = useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => fetchOrder(id),
  });
  const itemsQuery = useQuery({
    queryKey: queryKeys.orderItems(id),
    queryFn: () => fetchOrderItems(id),
  });

  const order = orderQuery.data ?? null;
  const items = itemsQuery.data ?? [];
  const loading = orderQuery.isPending || itemsQuery.isPending;

  const viewModel = useMemo(() => {
    if (!order) return null;
    return {
      documentNumber: order.document_number,
      orderDate: order.order_date,
      customerName: order.customer_name,
      deliveryAddress: order.delivery_address,
      accountCode: order.account_code,
      reference: order.reference,
      orderBy: order.sales_code,
      items: items.map((it) => ({
        id: it.id,
        code: it.product_code,
        description: it.product_description,
        quantity: it.quantity,
        price: it.price,
      })),
    };
  }, [order, items]);

  // Prefetch PDF so Share can run in the same user gesture (required on mobile)
  useEffect(() => {
    if (!order || itemsQuery.isPending) return;
    let cancelled = false;
    pdfBlobRef.current = null;
    setPdfReady(false);

    void (async () => {
      try {
        const blob = await resolveOrderPdfBlob(order, items);
        if (cancelled) return;
        pdfBlobRef.current = blob;
        setPdfReady(true);
        if (user && !order.pdf_path) {
          try {
            await uploadOrderPdf(user.id, order.id, blob);
            await orderQuery.refetch();
          } catch (e) {
            console.warn("[pdf] store on demand failed", e);
          }
        }
      } catch (e) {
        console.warn("[pdf] prefetch failed", e);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch identity not needed
  }, [order?.id, order?.pdf_path, items, user?.id]);

  async function getPdfBlob(): Promise<Blob> {
    if (pdfBlobRef.current) return pdfBlobRef.current;
    if (!order) throw new Error("Not ready");
    const blob = await resolveOrderPdfBlob(order, items);
    pdfBlobRef.current = blob;
    setPdfReady(true);
    return blob;
  }

  async function handleDownloadPdf() {
    if (!order) return;
    setBusy("download");
    try {
      const blob = await getPdfBlob();
      await downloadBlobAsFile(blob, orderPdfFileName(order.document_number));
      toast.success("PDF downloaded");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate PDF";
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  async function handleSharePdf() {
    if (!order) return;

    // If PDF isn't ready yet, prepare now — user must tap Share again (gesture rule)
    if (!pdfBlobRef.current) {
      setBusy("share");
      try {
        await getPdfBlob();
        toast.message("PDF ready — tap Share again to open WhatsApp / apps.");
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to prepare PDF";
        toast.error(msg);
      } finally {
        setBusy(null);
      }
      return;
    }

    setBusy("share");
    try {
      await shareOrDownloadPdf({
        blob: pdfBlobRef.current,
        documentNumber: order.document_number,
        customerName: order.customer_name,
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Failed to share PDF";
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="bg-muted/40 px-4 py-6 sm:px-6">
        <DocumentSkeleton />
      </div>
    );
  }

  if (!order || !viewModel) {
    return (
      <div className="p-6 sm:p-10">
        <p className="text-sm text-muted-foreground">Order Requisition not found.</p>
        <Link to="/" className="mt-4 inline-block text-sm underline">
          Back to History
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-muted/40 print:bg-white">
      <div className="mx-auto max-w-[210mm] px-4 py-4 sm:px-6 sm:py-6 print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> History
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => void handleDownloadPdf()}
              disabled={busy !== null}
            >
              <Download className="mr-2 h-4 w-4" />
              {busy === "download" ? "Preparing…" : "Download PDF"}
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => void handleSharePdf()}
              disabled={busy !== null}
            >
              <Share2 className="mr-2 h-4 w-4" />
              {busy === "share"
                ? "Preparing…"
                : pdfReady
                  ? "Share"
                  : "Prepare share"}
            </Button>
          </div>
        </div>
        {!pdfReady ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Preparing PDF for sharing… wait a moment, then tap Share.
          </p>
        ) : null}
      </div>

      <div className="px-2 pb-10 sm:px-4 sm:pb-12 print:px-0 print:pb-0">
        <SalesOrderDocument order={viewModel} />
      </div>

      <style>{`
        @media print {
          @page { margin: 12mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
