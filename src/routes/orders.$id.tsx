import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { toast } from "sonner";

import { fetchOrder, fetchOrderItems, queryKeys } from "@/lib/queries";
import { SalesOrderDocument } from "@/components/SalesOrderDocument";
import { DocumentSkeleton } from "@/components/loading/DocumentSkeleton";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orders/$id")({
  component: SalesOrderPage,
});

function SalesOrderPage() {
  const { id } = Route.useParams();
  const [downloading, setDownloading] = useState(false);

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

  async function handleDownloadPdf() {
    if (!order) return;
    setDownloading(true);
    try {
      const { buildPdfData, downloadSalesOrderPdf } = await import("@/components/SalesOrderPdf");
      const data = buildPdfData({
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
      await downloadSalesOrderPdf(data);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to generate PDF";
      toast.error(msg);
    } finally {
      setDownloading(false);
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
          Back to new Order Requisition
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-muted/40 print:bg-white">
      <div className="mx-auto max-w-[210mm] px-4 py-4 sm:px-6 sm:py-6 print:hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> New Order Requisition
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex-1 sm:flex-none" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button
              className="flex-1 sm:flex-none"
              onClick={() => void handleDownloadPdf()}
              disabled={downloading}
            >
              <Download className="mr-2 h-4 w-4" />
              {downloading ? "Preparing PDF…" : "Download PDF"}
            </Button>
          </div>
        </div>
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
