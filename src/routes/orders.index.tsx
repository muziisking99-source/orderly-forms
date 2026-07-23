import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Eye, Pencil, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { requireSession } from "@/lib/auth";
import { formatDisplayDate } from "@/lib/brand";
import {
  fetchMyOrders,
  fetchOrder,
  fetchOrderItems,
  queryKeys,
  type OrderListRow,
} from "@/lib/queries";
import {
  deleteOrderWithPdf,
  downloadBlobAsFile,
  orderPdfFileName,
  resolveOrderPdfBlob,
  shareOrDownloadPdf,
} from "@/lib/order-pdf";
import { PageHeaderSkeleton } from "@/components/loading/PageHeaderSkeleton";
import { TableSkeleton } from "@/components/loading/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/orders/")({
  beforeLoad: () => requireSession(),
  component: OrdersHistoryPage,
});

function OrdersHistoryPage() {
  const ordersQuery = useQuery({
    queryKey: queryKeys.myOrders,
    queryFn: fetchMyOrders,
  });

  const orders = ordersQuery.data ?? [];
  const loading = ordersQuery.isPending;

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
        <PageHeaderSkeleton />
        <Card className="mt-6">
          <CardContent className="p-0">
            <TableSkeleton rows={8} />
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:px-6 md:py-10">
      <div className="mb-6 md:mb-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Your documents
        </div>
        <h1 className="mt-2 font-display text-3xl leading-none text-foreground md:text-5xl">
          History
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Order Requisitions you have created. Open, edit, download, share, or delete.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {orders.length === 0
              ? "No documents yet"
              : `${orders.length} document${orders.length === 1 ? "" : "s"}`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="px-4 py-10 text-sm text-muted-foreground sm:px-6">
              Nothing here yet.{" "}
              <Link to="/" className="underline underline-offset-2">
                Create an Order Requisition
              </Link>
              .
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {orders.map((order) => (
                <HistoryRow key={order.id} order={order} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function HistoryRow({ order }: { order: OrderListRow }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<"download" | "share" | "delete" | null>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const pdfBlobRef = useRef<Blob | null>(null);

  async function withPdf(action: "download" | "share") {
    setBusy(action);
    try {
      const hadBlob = pdfBlobRef.current !== null;
      let blob = pdfBlobRef.current;
      if (!blob) {
        const full = await fetchOrder(order.id);
        if (!full) throw new Error("Order not found");
        const items = await fetchOrderItems(order.id);
        blob = await resolveOrderPdfBlob(full, items);
        pdfBlobRef.current = blob;
        setPdfReady(true);
      }

      if (action === "download") {
        await downloadBlobAsFile(blob, orderPdfFileName(order.document_number));
        toast.success("PDF downloaded");
        return;
      }

      // First Share tap prepares the file; second tap opens the share sheet
      // (mobile browsers require share() inside a fresh user tap)
      if (!hadBlob) {
        toast.message("PDF ready — tap Share again to open WhatsApp / apps.");
        return;
      }

      await shareOrDownloadPdf({
        blob,
        documentNumber: order.document_number,
        customerName: order.customer_name,
      });
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") return;
      const msg = e instanceof Error ? e.message : "Something went wrong";
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete ${order.document_number}? This cannot be undone.`)) {
      return;
    }
    setBusy("delete");
    try {
      await deleteOrderWithPdf(order);
      await queryClient.invalidateQueries({ queryKey: queryKeys.myOrders });
      toast.success(`${order.document_number} deleted`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete";
      toast.error(msg);
    } finally {
      setBusy(null);
    }
  }

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        <div className="font-medium tabular-nums text-foreground">{order.document_number}</div>
        <div className="mt-0.5 truncate text-sm text-foreground/90">{order.customer_name}</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {formatDisplayDate(order.order_date)}
          {order.account_code ? ` · ${order.account_code}` : ""}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link to="/orders/$id" params={{ id: order.id }}>
            <Eye className="mr-1.5 h-4 w-4" />
            Open
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link to="/orders/$id/edit" params={{ id: order.id }}>
            <Pencil className="mr-1.5 h-4 w-4" />
            Edit
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={busy !== null}
          onClick={() => void withPdf("download")}
        >
          <Download className="mr-1.5 h-4 w-4" />
          {busy === "download" ? "…" : "PDF"}
        </Button>
        <Button size="sm" disabled={busy !== null} onClick={() => void withPdf("share")}>
          <Share2 className="mr-1.5 h-4 w-4" />
          {busy === "share" ? "…" : "Share"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          disabled={busy !== null}
          onClick={() => void handleDelete()}
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          {busy === "delete" ? "…" : "Delete"}
        </Button>
      </div>
    </li>
  );
}
