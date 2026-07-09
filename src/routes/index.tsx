import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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

type LineItem = {
  key: string;
  product_id: string | null;
  quantity: string;
};

function newLine(): LineItem {
  return { key: crypto.randomUUID(), product_id: null, quantity: "1" };
}

function NewOrderPage() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<string>("");
  const [items, setItems] = useState<LineItem[]>([newLine()]);
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

  function updateItem(key: string, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  async function handleSubmit() {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    const clean = items
      .map((it) => ({ ...it, qty: Number(it.quantity) }))
      .filter((it) => it.product_id && it.qty > 0);
    if (clean.length === 0) {
      toast.error("Add at least one line item");
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
          sales_code: selectedCustomer.sales_code,
        })
        .select()
        .single();
      if (orderErr || !order) throw orderErr ?? new Error("Failed to create order");

      const rows = clean.map((it, idx) => {
        const p = products.find((pp) => pp.id === it.product_id)!;
        return {
          order_id: order.id,
          product_id: p.id,
          product_code: p.code,
          product_description: p.description,
          product_unit: p.unit,
          quantity: it.qty,
          position: idx,
        };
      });
      const { error: itemsErr } = await supabase.from("order_items").insert(rows);
      if (itemsErr) throw itemsErr;

      toast.success(`Order ${order.document_number} created`);
      navigate({ to: "/orders/$id", params: { id: order.id } });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save order";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">New Order</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Choose a customer, add products and quantities, then generate a delivery slip.
      </p>

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
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", customerId === c.id ? "opacity-100" : "opacity-0")} />
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
                value={selectedCustomer.tax_rate != null ? `${selectedCustomer.tax_rate}%` : null}
              />
              <div className="sm:col-span-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  Delivery address
                </Label>
                <Textarea readOnly value={selectedCustomer.delivery_address ?? ""} className="mt-1 bg-background" />
              </div>
            </div>
          )}

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
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Line items</CardTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setItems((p) => [...p, newLine()])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add line
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((it, idx) => {
            const product = products.find((p) => p.id === it.product_id) ?? null;
            return (
              <div
                key={it.key}
                className="grid grid-cols-12 items-end gap-2 rounded-md border border-border p-3"
              >
                <div className="col-span-12 sm:col-span-7">
                  <Label className="text-xs">Product #{idx + 1}</Label>
                  <ProductPicker
                    products={products}
                    value={product}
                    onChange={(p) => updateItem(it.key, { product_id: p?.id ?? null })}
                  />
                </div>
                <div className="col-span-8 sm:col-span-3">
                  <Label className="text-xs">Quantity</Label>
                  <Input
                    type="number"
                    min="0"
                    step="any"
                    value={it.quantity}
                    onChange={(e) => updateItem(it.key, { quantity: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div className="col-span-4 sm:col-span-2 flex items-end justify-end sm:justify-start">
                  <div className="flex-1 text-sm text-muted-foreground">
                    {product?.unit ?? "—"}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setItems((p) => (p.length === 1 ? [newLine()] : p.filter((x) => x.key !== it.key)))
                    }
                    aria-label="Remove line"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Creating…" : "Create delivery slip"}
        </Button>
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

function ProductPicker({
  products,
  value,
  onChange,
}: {
  products: Product[];
  value: Product | null;
  onChange: (p: Product | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="mt-1 w-full justify-between font-normal">
          {value ? `${value.code} — ${value.description}` : "Select product…"}
          <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search products…" />
          <CommandList>
            <CommandEmpty>No product found.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.code} ${p.description}`}
                  onSelect={() => {
                    onChange(p);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", value?.id === p.id ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col">
                    <span className="font-medium">{p.code}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.description} · {p.unit}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
