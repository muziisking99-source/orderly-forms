import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Check, ChevronsUpDown, Eraser, Search } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { groupProductsByRange } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: NewOrderPage,
});

type Customer = {
  id: string;
  name: string;
  account_code: string | null;
  delivery_address: string | null;
  reference: string | null;
  tax_number: string | null;
  tax_rate: number | null;
  sales_code: string | null;
};

type Product = {
  id: string;
  code: string;
  description: string;
  unit: string;
};

function NewOrderPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [orderedBy, setOrderedBy] = useState("");
  /** productId -> quantity string (blank = 0) */
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [productFilter, setProductFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const [{ data: cs }, { data: ps }] = await Promise.all([
        supabase.from("customers").select("*").order("name"),
        supabase.from("products").select("*").order("code"),
      ]);
      setCustomers((cs as Customer[]) ?? []);
      setProducts((ps as Product[]) ?? []);
    })();
  }, []);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === customerId) ?? null,
    [customers, customerId],
  );

  const filteredProducts = useMemo(() => {
    const q = productFilter.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.code.toLowerCase().includes(q) || p.description.toLowerCase().includes(q),
    );
  }, [products, productFilter]);

  const grouped = useMemo(() => groupProductsByRange(filteredProducts), [filteredProducts]);

  const summary = useMemo(() => {
    let itemCount = 0;
    let unitTotal = 0;
    for (const p of products) {
      const qty = Number(quantities[p.id]);
      if (Number.isFinite(qty) && qty > 0) {
        itemCount += 1;
        unitTotal += qty;
      }
    }
    return { itemCount, unitTotal };
  }, [products, quantities]);

  function setQty(productId: string, value: string) {
    setQuantities((prev) => ({ ...prev, [productId]: value }));
  }

  function clearAllQuantities() {
    setQuantities({});
  }

  async function handleSubmit() {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    const clean = products
      .map((p) => ({ product: p, qty: Number(quantities[p.id]) }))
      .filter((it) => Number.isFinite(it.qty) && it.qty > 0);

    if (clean.length === 0) {
      toast.error("Enter a quantity for at least one product");
      return;
    }

    setSubmitting(true);
    try {
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: selectedCustomer.id,
          delivery_date: deliveryDate || null,
          customer_name: selectedCustomer.name,
          account_code: selectedCustomer.account_code,
          delivery_address: selectedCustomer.delivery_address,
          reference: selectedCustomer.reference,
          sales_code: orderedBy.trim() || null,
        })
        .select()
        .single();
      if (orderErr || !order) throw orderErr ?? new Error("Failed to create sales requisition");

      const rows = clean.map((it, idx) => ({
        order_id: order.id,
        product_id: it.product.id,
        product_code: it.product.code,
        product_description: it.product.description,
        product_unit: it.product.unit,
        quantity: it.qty,
        position: idx,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(rows);
      if (itemsErr) throw itemsErr;

      toast.success(`Sales Requisition ${order.document_number} created`);
      navigate({ to: "/orders/$id", params: { id: order.id } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save sales requisition";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 pb-28">
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          New document
        </div>
        <h1 className="mt-2 font-display text-4xl leading-none text-foreground md:text-5xl">
          Sales Requisition
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Select a customer, enter quantities against the product catalogue, then create the Sales
          Requisition.
        </p>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Customer</Label>
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="mt-1 w-full justify-between font-normal"
                >
                  {selectedCustomer ? selectedCustomer.name : "Select customer…"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search customers…" />
                  <CommandList>
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      {customers.map((c) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.name} ${c.account_code ?? ""}`}
                          onSelect={() => {
                            setCustomerId(c.id);
                            setCustomerOpen(false);
                            setOrderedBy((prev) => prev || c.sales_code || "");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              customerId === c.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{c.name}</span>
                            {c.account_code && (
                              <span className="text-xs text-muted-foreground">{c.account_code}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {selectedCustomer && (
            <div className="grid gap-4 rounded-md border border-border bg-muted/40 p-4 sm:grid-cols-2">
              <ReadField label="Account code" value={selectedCustomer.account_code} />
              <ReadField label="Reference" value={selectedCustomer.reference} />
              <ReadField label="Sales code" value={selectedCustomer.sales_code} />
              <ReadField label="Tax number" value={selectedCustomer.tax_number} />
              <ReadField
                label="Tax rate"
                value={
                  selectedCustomer.tax_rate != null
                    ? selectedCustomer.tax_rate === 0
                      ? "Exempt"
                      : `${selectedCustomer.tax_rate}%`
                    : null
                }
              />
              <div className="sm:col-span-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Delivery address
                </Label>
                <Textarea
                  readOnly
                  value={selectedCustomer.delivery_address ?? ""}
                  className="mt-1 bg-background"
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="max-w-xs">
              <Label htmlFor="delivery-date">Delivery date</Label>
              <Input
                id="delivery-date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="max-w-xs">
              <Label htmlFor="ordered-by">Order by</Label>
              <Input
                id="ordered-by"
                value={orderedBy}
                onChange={(e) => setOrderedBy(e.target.value)}
                placeholder="Name of person ordering…"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Products</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter quantities for the lines you need. Empty rows are ignored.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[14rem] flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                placeholder="Filter by code or description…"
                className="pl-8"
                aria-label="Filter products"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={clearAllQuantities}>
              <Eraser className="mr-1.5 h-4 w-4" />
              Clear all quantities
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="px-6 py-10 text-sm text-muted-foreground">
              No products yet. Add them in Admin.
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="px-6 py-10 text-sm text-muted-foreground">
              No products match “{productFilter}”.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-card">
                  <tr className="border-b border-border text-left">
                    <th className="px-4 py-3 font-semibold">Code</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Unit</th>
                    <th className="w-36 px-4 py-3 text-right font-semibold">Quantity</th>
                  </tr>
                </thead>
                <tbody>
                  {grouped.map((group) => (
                    <Fragment key={group.label}>
                      <tr className="bg-muted/50">
                        <td
                          colSpan={4}
                          className="px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                        >
                          {group.label}
                        </td>
                      </tr>
                      {group.products.map((p) => {
                        const hasQty =
                          Number(quantities[p.id]) > 0 && Number.isFinite(Number(quantities[p.id]));
                        return (
                          <tr
                            key={p.id}
                            className={cn(
                              "border-b border-border/70 transition-colors",
                              hasQty ? "bg-primary/5" : "hover:bg-muted/30",
                            )}
                          >
                            <td className="px-4 py-2 font-medium tabular-nums text-foreground">
                              {p.code}
                            </td>
                            <td className="px-4 py-2 text-foreground/90">{p.description}</td>
                            <td className="px-4 py-2 text-muted-foreground">{p.unit}</td>
                            <td className="px-4 py-2 text-right">
                              <Input
                                type="number"
                                min="0"
                                step="any"
                                inputMode="decimal"
                                placeholder="0"
                                value={quantities[p.id] ?? ""}
                                onChange={(e) => setQty(p.id, e.target.value)}
                                className="ml-auto h-9 w-28 text-right tabular-nums"
                                aria-label={`Quantity for ${p.code}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 backdrop-blur-md print:hidden"
        style={{ "--tw-shadow": "0 -8px 24px rgba(11,31,58,0.06)" } as CSSProperties}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3.5">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{summary.itemCount}</span>{" "}
            {summary.itemCount === 1 ? "item" : "items"}
            <span className="mx-2 text-border">·</span>
            <span className="font-semibold tabular-nums text-foreground">
              {Number.isInteger(summary.unitTotal)
                ? summary.unitTotal
                : summary.unitTotal.toFixed(2)}
            </span>{" "}
            units total
          </div>
          <Button onClick={handleSubmit} disabled={submitting} size="lg">
            {submitting ? "Creating…" : "Create Sales Requisition"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function ReadField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm">
        {value || <span className="text-muted-foreground">—</span>}
      </div>
    </div>
  );
}
