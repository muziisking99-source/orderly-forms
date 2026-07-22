import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  fetchCustomers,
  fetchProducts,
  queryKeys,
  type CustomerRow,
  type ProductRow,
} from "@/lib/queries";
import { TableSkeleton } from "@/components/loading/TableSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BulkImportDialog, type BulkImportConfig } from "@/components/BulkImportDialog";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Customer = CustomerRow;
type Product = ProductRow;

function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-6 md:mb-8">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Workspace</div>
        <h1 className="mt-2 font-display text-3xl leading-none text-foreground md:text-5xl">
          Admin <span className="italic text-primary">panel</span>
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Manage customers and products, or bulk upload from a spreadsheet.
        </p>
      </div>

      <Tabs defaultValue="customers" className="mt-4 md:mt-6">
        <TabsList>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>
        <TabsContent value="customers" className="mt-4">
          <CustomersPanel />
        </TabsContent>
        <TabsContent value="products" className="mt-4">
          <ProductsPanel />
        </TabsContent>
      </Tabs>
    </main>
  );
}

const EMPTY_CUSTOMER: Omit<Customer, "id"> = {
  name: "",
  account_code: "",
  delivery_address: "",
  reference: "",
  tax_number: "",
  tax_rate: null,
  sales_code: "",
};

function CustomersPanel() {
  const queryClient = useQueryClient();
  const { data: rows = [], isPending: loading } = useQuery({
    queryKey: queryKeys.customers,
    queryFn: fetchCustomers,
  });
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.customers }),
    ]);
  }

  async function remove(id: string) {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      const msg = error.message.includes("foreign key")
        ? "This customer is used on existing order requisitions and can’t be deleted."
        : error.message;
      toast.error(msg);
    } else {
      toast.success("Customer deleted");
      void invalidate();
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Customers</CardTitle>
        <div className="flex flex-wrap gap-2">
          <BulkImportDialog config={CUSTOMER_IMPORT_CONFIG} onImported={() => void invalidate()} />
          <Button
            size="sm"
            onClick={() => {
              setEditing({ id: "", ...EMPTY_CUSTOMER });
              setOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add customer
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TableSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">No customers yet.</div>
        ) : (
          <div className="overflow-x-auto text-xs sm:text-sm">
            <table className="w-full">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Account</th>
                  <th className="hidden py-2 pr-4 sm:table-cell">Reference</th>
                  <th className="hidden py-2 pr-4 md:table-cell">Order by</th>
                  <th className="py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="py-2 pr-4 font-medium">{c.name}</td>
                    <td className="py-2 pr-4">{c.account_code || "—"}</td>
                    <td className="hidden py-2 pr-4 sm:table-cell">{c.reference || "—"}</td>
                    <td className="hidden py-2 pr-4 md:table-cell">{c.sales_code || "—"}</td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(c);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(c.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <CustomerDialog
        open={open}
        onOpenChange={setOpen}
        customer={editing}
        onSaved={() => {
          setOpen(false);
          void invalidate();
        }}
      />
    </Card>
  );
}

function CustomerDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  customer: Customer | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Customer>({ id: "", ...EMPTY_CUSTOMER });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (customer) setForm(customer);
  }, [customer]);

  async function save() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      account_code: form.account_code || null,
      delivery_address: form.delivery_address || null,
      reference: form.reference || null,
      tax_number: form.tax_number || null,
      tax_rate: form.tax_rate === null || Number.isNaN(form.tax_rate) ? null : Number(form.tax_rate),
      sales_code: form.sales_code || null,
    };
    const { error } = form.id
      ? await supabase.from("customers").update(payload).eq("id", form.id)
      : await supabase.from("customers").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Customer saved");
      onSaved();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit customer" : "New customer"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name *">
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Account code">
            <Input
              value={form.account_code ?? ""}
              onChange={(e) => setForm({ ...form, account_code: e.target.value })}
            />
          </Field>
          <Field label="Reference">
            <Input
              value={form.reference ?? ""}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
            />
          </Field>
          <Field label="Order by">
            <Input
              value={form.sales_code ?? ""}
              onChange={(e) => setForm({ ...form, sales_code: e.target.value })}
            />
          </Field>
          <Field label="Tax number">
            <Input
              value={form.tax_number ?? ""}
              onChange={(e) => setForm({ ...form, tax_number: e.target.value })}
            />
          </Field>
          <Field label="Tax rate (%)">
            <Input
              type="number"
              step="any"
              value={form.tax_rate ?? ""}
              onChange={(e) =>
                setForm({ ...form, tax_rate: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Delivery address">
              <Textarea
                value={form.delivery_address ?? ""}
                onChange={(e) => setForm({ ...form, delivery_address: e.target.value })}
                rows={3}
              />
            </Field>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProductsPanel() {
  const queryClient = useQueryClient();
  const { data: rows = [], isPending: loading } = useQuery({
    queryKey: queryKeys.products,
    queryFn: fetchProducts,
  });
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.products }),
      queryClient.invalidateQueries({ queryKey: queryKeys.productsCatalog }),
    ]);
  }

  async function remove(id: string) {
    if (
      !confirm(
        "Delete this product? Existing order requisitions will keep the product code and description.",
      )
    ) {
      return;
    }
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Product deleted");
      void invalidate();
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Products</CardTitle>
        <div className="flex flex-wrap gap-2">
          <BulkImportDialog config={PRODUCT_IMPORT_CONFIG} onImported={() => void invalidate()} />
          <Button
            size="sm"
            onClick={() => {
              setEditing({ id: "", code: "", description: "", unit: "" });
              setOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Add product
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TableSkeleton rows={6} />
        ) : rows.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">No products yet.</div>
        ) : (
          <div className="overflow-x-auto text-xs sm:text-sm">
            <table className="w-full">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="hidden py-2 pr-4 sm:table-cell">Unit</th>
                  <th className="py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border">
                    <td className="py-2 pr-4 font-mono text-xs">{p.code}</td>
                    <td className="py-2 pr-4">{p.description}</td>
                    <td className="hidden py-2 pr-4 sm:table-cell">{p.unit || "—"}</td>
                    <td className="py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditing(p);
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(p.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <ProductDialog
        open={open}
        onOpenChange={setOpen}
        product={editing}
        onSaved={() => {
          setOpen(false);
          void invalidate();
        }}
      />
    </Card>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: Product | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<Product>({ id: "", code: "", description: "", unit: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) setForm(product);
  }, [product]);

  async function save() {
    if (!form.code.trim() || !form.description.trim()) {
      toast.error("Code and description are required");
      return;
    }
    setSaving(true);
    const payload: {
      code: string;
      description: string;
      unit: string;
      sort_order?: number;
    } = {
      code: form.code,
      description: form.description,
      unit: form.unit.trim() || "",
    };

    if (!form.id) {
      const { data: last } = await supabase
        .from("products")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      payload.sort_order = ((last as { sort_order?: number } | null)?.sort_order ?? -1) + 1;
    }

    const { error } = form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Product saved");
      onSaved();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label="Code *">
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
          </Field>
          <Field label="Description *">
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Field label="Unit">
            <Input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="Optional"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

const CUSTOMER_IMPORT_CONFIG: BulkImportConfig = {
  table: "customers",
  entityLabel: "customer",
  dedupeKey: "account_code",
  dedupeFallbackKey: "name",
  fields: [
    { key: "name", label: "Name", required: true, aliases: ["customer name", "customer"] },
    { key: "account_code", label: "Account code", aliases: ["account", "account no", "account number"] },
    { key: "delivery_address", label: "Delivery address", aliases: ["address", "ship to"] },
    { key: "reference", label: "Reference", aliases: ["ref"] },
    { key: "tax_number", label: "Tax reference", aliases: ["tax number", "tax ref", "vat", "vat number"] },
    {
      key: "tax_rate",
      label: "Tax exempt",
      aliases: ["tax rate", "vat rate", "tax", "exempt"],
      transform: (v) => {
        if (v == null || v === "") return null;
        const s = String(v).trim().toLowerCase();
        if (["yes", "true", "y", "exempt", "1"].includes(s)) return 0;
        if (["no", "false", "n", "0"].includes(s)) return null;
        const n = Number(String(v).replace("%", ""));
        return Number.isFinite(n) ? n : null;
      },
    },
    { key: "sales_code", label: "Order by", aliases: ["sales", "salesperson", "rep", "order by"] },
  ],
};

const PRODUCT_IMPORT_CONFIG: BulkImportConfig = {
  table: "products",
  entityLabel: "product",
  dedupeKey: "code",
  insertDefaults: { unit: "" },
  sortOrderField: "sort_order",
  fields: [
    { key: "code", label: "Code", required: true, aliases: ["product code", "sku"] },
    {
      key: "description",
      label: "Description",
      required: true,
      aliases: ["name", "product", "product description"],
    },
  ],
};
