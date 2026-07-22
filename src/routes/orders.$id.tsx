import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { SalesOrderDocument } from "@/components/SalesOrderDocument";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orders/$id")({
  component: SalesOrderPage,
});

type Order = {
  id: string;
  document_number: string;
  order_date: string;
  customer_name: string;
  account_code: string | null;
  delivery_address: string | null;
  reference: string | null;
  sales_code: string | null;
};

type Item = {
  id: string;
  product_code: string;
  product_description: string;
  quantity: string;
  position: number;
};

function SalesOrderPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      const [{ data: o }, { data: is }] = await Promise.all([
        supabase.from("orders").select("*").eq("id", id).maybeSingle(),
        supabase.from("order_items").select("*").eq("order_id", id).order("position"),
      ]);
      setOrder(o as Order | null);
      setItems((is as Item[]) ?? []);
      setLoading(false);
    })();
  }, [id]);

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
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!order || !viewModel) {
    return (
      <div className="p-10">
        <p className="text-sm text-muted-foreground">Order Requisition not found.</p>
        <Link to="/" className="mt-4 inline-block text-sm underline">
          Back to new Order Requisition
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-muted/40 print:bg-white">
      <div className="mx-auto max-w-[210mm] px-6 py-6 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> New Order Requisition
          </Link>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" /> Print
            </Button>
            <Button onClick={() => void handleDownloadPdf()} disabled={downloading}>
              <Download className="mr-2 h-4 w-4" />
              {downloading ? "Preparing PDF…" : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-12 print:px-0 print:pb-0">
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
