import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer, ArrowLeft } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orders/$id")({
  component: OrderSlipPage,
});

type Order = {
  id: string;
  document_number: string;
  order_date: string;
  delivery_date: string | null;
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
  product_unit: string;
  quantity: number;
  position: number;
};

function formatDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function OrderSlipPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!order) {
    return (
      <div className="p-10">
        <p className="text-sm text-muted-foreground">Order not found.</p>
        <Link to="/" className="mt-4 inline-block text-sm underline">
          Back to new order
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 print:bg-white">
      <div className="mx-auto max-w-4xl px-6 py-6 print:hidden">
        <div className="flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> New order
          </Link>
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
          </Button>
        </div>
      </div>

      <main className="mx-auto max-w-4xl bg-card px-10 py-10 shadow-sm print:max-w-none print:px-8 print:py-6 print:shadow-none">
        <div className="flex items-start justify-between border-b border-border pb-6">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Delivery / Picking Slip</div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{order.document_number}</h1>
          </div>
          <dl className="text-right text-sm">
            <div className="flex justify-end gap-6">
              <dt className="text-muted-foreground">Date</dt>
              <dd className="font-medium">{formatDate(order.order_date)}</dd>
            </div>
            <div className="mt-1 flex justify-end gap-6">
              <dt className="text-muted-foreground">Delivery date</dt>
              <dd className="font-medium">{formatDate(order.delivery_date)}</dd>
            </div>
          </dl>
        </div>

        <section className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Deliver To</div>
            <div className="mt-2 text-base font-semibold">{order.customer_name}</div>
            {order.delivery_address && (
              <div className="mt-1 whitespace-pre-line text-sm text-foreground/80">
                {order.delivery_address}
              </div>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">Account</dt>
            <dd className="font-medium">{order.account_code || "—"}</dd>
            <dt className="text-muted-foreground">Reference</dt>
            <dd className="font-medium">{order.reference || "—"}</dd>
            <dt className="text-muted-foreground">Sales code</dt>
            <dd className="font-medium">{order.sales_code || "—"}</dd>
          </dl>
        </section>

        <section className="mt-8">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-foreground text-left">
                <th className="py-2 pr-4 font-semibold">Code</th>
                <th className="py-2 pr-4 font-semibold">Description</th>
                <th className="py-2 pr-4 text-right font-semibold">Quantity</th>
                <th className="py-2 font-semibold">Unit</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-border">
                  <td className="py-2 pr-4 font-mono text-xs">{it.product_code}</td>
                  <td className="py-2 pr-4">{it.product_description}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{it.quantity}</td>
                  <td className="py-2">{it.product_unit}</td>
                </tr>
              ))}
              {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
                <tr key={`blank-${i}`} className="border-b border-border">
                  <td className="py-2">&nbsp;</td>
                  <td></td>
                  <td></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-16 border-t border-border pt-6 text-sm">
          <div className="font-medium">Received in good order</div>
          <div className="mt-6 grid grid-cols-2 gap-8">
            <div>
              <div className="border-b border-foreground pb-1">&nbsp;</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Signed</div>
            </div>
            <div>
              <div className="border-b border-foreground pb-1">&nbsp;</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">Date</div>
            </div>
          </div>
        </footer>
      </main>

      <style>{`
        @media print {
          @page { margin: 16mm; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}
