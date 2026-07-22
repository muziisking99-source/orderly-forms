import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type CSSProperties } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Eraser, Search } from "lucide-react";
import { toast } from "sonner";

import { requireSession, useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchCustomers,
  fetchProductsCatalog,
  queryKeys,
  type CustomerRow,
} from "@/lib/queries";
import {
  generatePdfBlob,
  pdfDataFromOrder,
  uploadOrderPdf,
} from "@/lib/order-pdf";
import { ProductCatalogTable } from "@/components/ProductCatalogTable";
import { TableSkeleton } from "@/components/loading/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  beforeLoad: () => requireSession(),
  component: NewOrderPage,
});

function NewOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [productFilter, setProductFilter] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);

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
      if (!user) throw new Error("You must be signed in");

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_id: selectedCustomer.id,
          customer_name: selectedCustomer.name,
          account_code: selectedCustomer.account_code,
          delivery_address: selectedCustomer.delivery_address,
          reference: null,
          sales_code: selectedCustomer.sales_code,
          user_id: user.id,
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

      try {
        const itemRows = rows.map((r, i) => ({
          id: String(i),
          product_code: r.product_code,
          product_description: r.product_description,
          quantity: r.quantity,
          price: r.price,
          position: r.position,
        }));
        const blob = await generatePdfBlob(pdfDataFromOrder(order, itemRows));
        await uploadOrderPdf(user.id, order.id, blob);
      } catch (pdfErr) {
        console.warn("[pdf] upload after create failed", pdfErr);
      }

      toast.success(`Order Requisition ${order.document_number} created`);
      void queryClient.invalidateQueries({ queryKey: queryKeys.myOrders });
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
      <main className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden md:h-[calc(100dvh-4.25rem)]">
        <div className="shrink-0 border-b border-border/70 px-4 py-3 md:px-6">
          <div className="mx-auto h-8 max-w-6xl animate-pulse rounded-md bg-primary/10" />
        </div>
        <div className="min-h-0 flex-1 p-0">
          <TableSkeleton rows={12} />
        </div>
      </main>
    );
  }

  return (
    <main className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden md:h-[calc(100dvh-4.25rem)]">
      {/* Compact top strip */}
      <div className="shrink-0 border-b border-border/70 bg-background/95 px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="font-display text-xl leading-none text-[var(--brand-navy)] md:text-2xl">
              New Order Requisition
            </h1>
            <p className="text-xs text-muted-foreground">
              Price optional — blank hides it on the document
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_auto] sm:items-center">
            <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
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
                            setAddressOpen(false);
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
                            <span className="truncate text-xs text-muted-foreground">
                              {c.name}
                              {c.sales_code?.trim() ? ` · ${c.sales_code}` : ""}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <div className="relative min-w-0">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                placeholder="Filter products…"
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
              Clear
            </Button>
          </div>

          {selectedCustomer ? (
            <div className="min-w-0 text-xs text-muted-foreground">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span>
                  <span className="text-muted-foreground">Account </span>
                  <span className="font-medium text-foreground">
                    {selectedCustomer.account_code || "—"}
                  </span>
                </span>
                <span>
                  <span className="text-muted-foreground">Order by </span>
                  <span className="font-medium text-foreground">
                    {selectedCustomer.sales_code?.trim() || "—"}
                  </span>
                </span>
                <span className="font-medium text-foreground">{selectedCustomer.name}</span>
                {selectedCustomer.delivery_address ? (
                  <button
                    type="button"
                    className="text-primary underline-offset-2 hover:underline"
                    onClick={() => setAddressOpen((o) => !o)}
                  >
                    {addressOpen ? "Hide address" : "Show address"}
                  </button>
                ) : null}
              </div>
              {addressOpen && selectedCustomer.delivery_address ? (
                <p className="mt-1 whitespace-pre-line text-foreground/80">
                  {selectedCustomer.delivery_address}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Catalogue fills remaining viewport — only scroll here */}
      <div className="mx-auto min-h-0 w-full max-w-6xl flex-1 overflow-hidden border-x border-border/40 bg-card">
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
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden"
        style={{ "--tw-shadow": "0 -8px 24px rgba(11,31,58,0.06)" } as CSSProperties}
      >
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-6">
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{itemCount}</span>{" "}
            {itemCount === 1 ? "item" : "items"}
          </div>
          <Button
            onClick={() => void handleSubmit()}
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
