import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Eraser, Search } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  fetchCustomers,
  fetchProductsCatalog,
  queryKeys,
  type CustomerRow,
} from "@/lib/queries";
import { ProductCatalogTable } from "@/components/ProductCatalogTable";
import { PageHeaderSkeleton } from "@/components/loading/PageHeaderSkeleton";
import { TableSkeleton } from "@/components/loading/TableSkeleton";
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

function NewOrderPage() {
  const navigate = useNavigate();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [productFilter, setProductFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const customersQuery = useQuery({
    queryKey: queryKeys.customers,
    queryFn: fetchCustomers,
  });
  const productsQuery = useQuery({
    queryKey: queryKeys.productsCatalog,
    queryFn: fetchProductsCatalog,
  });

  const customers = customersQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const loading = customersQuery.isPending || productsQuery.isPending;

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

  const itemCount = useMemo(() => {
    let count = 0;
    for (const p of products) {
      if ((quantities[p.id] ?? "").trim() !== "") count += 1;
    }
    return count;
  }, [products, quantities]);

  function setQty(productId: string, value: string) {
    setQuantities((prev) => ({ ...prev, [productId]: value }));
  }

  function setPrice(productId: string, value: string) {
    setPrices((prev) => ({ ...prev, [productId]: value }));
  }

  function clearAllQuantities() {
    setQuantities({});
    setPrices({});
  }

  async function handleSubmit() {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    const clean = products
      .map((p) => ({
        product: p,
        qty: (quantities[p.id] ?? "").trim(),
        price: (prices[p.id] ?? "").trim(),
      }))
      .filter((it) => it.qty !== "");

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
          customer_name: selectedCustomer.name,
          account_code: selectedCustomer.account_code,
          delivery_address: selectedCustomer.delivery_address,
          reference: selectedCustomer.reference,
          sales_code: selectedCustomer.sales_code,
        })
        .select()
        .single();
      if (orderErr || !order) throw orderErr ?? new Error("Failed to create order requisition");

      const rows = clean.map((it, idx) => ({
        order_id: order.id,
        product_id: it.product.id,
        product_code: it.product.code,
        product_description: it.product.description,
        product_unit: "",
        quantity: it.qty,
        price: it.price || null,
        position: idx,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(rows);
      if (itemsErr) throw itemsErr;

      toast.success(`Order Requisition ${order.document_number} created`);
      navigate({ to: "/orders/$id", params: { id: order.id } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save order requisition";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 pb-28 md:px-6 md:py-10 lg:max-w-6xl">
        <PageHeaderSkeleton />
        <div className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <SkeletonTitle />
            </CardHeader>
            <CardContent>
              <div className="h-10 w-full animate-pulse rounded-md bg-primary/10" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <SkeletonTitle />
            </CardHeader>
            <CardContent className="p-0">
              <TableSkeleton rows={10} />
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 pb-28 md:px-6 md:py-10 lg:max-w-6xl">
      <div className="mb-6 md:mb-8">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          New document
        </div>
        <h1 className="mt-2 font-display text-3xl leading-none text-foreground md:text-5xl">
          Order Requisition
        </h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground">
          Select a customer by code, enter quantities against the product catalogue, then create the
          Order Requisition.
        </p>
      </div>

      <Card className="mt-4 md:mt-6">
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
                  <span className="truncate">
                    {selectedCustomer
                      ? selectedCustomer.account_code || selectedCustomer.name
                      : "Select customer…"}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-2rem)] p-0"
                align="start"
              >
                <Command>
                  <CommandInput placeholder="Search by customer code…" />
                  <CommandList>
                    <CommandEmpty>No customer found.</CommandEmpty>
                    <CommandGroup>
                      {customers.map((c: CustomerRow) => (
                        <CommandItem
                          key={c.id}
                          value={`${c.account_code ?? ""} ${c.name}`}
                          onSelect={() => {
                            setCustomerId(c.id);
                            setCustomerOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 shrink-0",
                              customerId === c.id ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <div className="flex min-w-0 flex-col">
                            <span className="font-medium">
                              {c.account_code || <span className="text-muted-foreground">—</span>}
                            </span>
                            <span className="truncate text-xs text-muted-foreground">{c.name}</span>
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
              <ReadField label="Order by" value={selectedCustomer.sales_code} />
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
        </CardContent>
      </Card>

      <Card className="mt-4 md:mt-6">
        <CardHeader className="flex flex-col gap-4">
          <div>
            <CardTitle>Products</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              Enter quantities for the lines you need. Price is optional — leave blank to hide it on
              the document.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="relative w-full flex-1 sm:min-w-[14rem] sm:flex-none">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                placeholder="Filter by code or description…"
                className="pl-8"
                aria-label="Filter products"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:w-auto"
              onClick={clearAllQuantities}
            >
              <Eraser className="mr-1.5 h-4 w-4" />
              Clear all
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <div className="px-4 py-10 text-sm text-muted-foreground sm:px-6">
              No products yet. Add them in Admin.
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="px-4 py-10 text-sm text-muted-foreground sm:px-6">
              No products match “{productFilter}”.
            </div>
          ) : (
            <ProductCatalogTable
              products={filteredProducts}
              quantities={quantities}
              prices={prices}
              onQtyChange={setQty}
              onPriceChange={setPrice}
            />
          )}
        </CardContent>
      </Card>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden"
        style={{ "--tw-shadow": "0 -8px 24px rgba(11,31,58,0.06)" } as CSSProperties}
      >
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between md:px-6 lg:max-w-6xl">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{itemCount}</span>{" "}
            {itemCount === 1 ? "item" : "items"}
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            size="lg"
            className="w-full sm:w-auto"
          >
            {submitting ? "Creating…" : "Create Order Requisition"}
          </Button>
        </div>
      </div>
    </main>
  );
}

function SkeletonTitle() {
  return <div className="h-5 w-28 animate-pulse rounded bg-primary/10" />;
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
