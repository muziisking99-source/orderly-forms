import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
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

export const Route = createFileRoute("/admin")({
  component: AdminPage,
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

function AdminPage() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="mt-1 text-sm text-muted-foreground">Manage customers and products.</p>

      <Tabs defaultValue="customers" className="mt-6">
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

// ------------------- Customers -------------------

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
  const [rows, setRows] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("customers").select("*").order("name");
    setRows((data as Customer[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this customer?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Customer deleted");
      void load();
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Customers</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditing({ id: "", ...EMPTY_CUSTOMER });
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add customer
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">No customers yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Account</th>
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2 pr-4">Sales</th>
                  <th className="py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-border">
                    <td className="py-2 pr-4 font-medium">{c.name}</td>
                    <td className="py-2 pr-4">{c.account_code || "—"}</td>
                    <td className="py-2 pr-4">{c.reference || "—"}</td>
                    <td className="py-2 pr-4">{c.sales_code || "—"}</td>
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
          void load();
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
      <DialogContent className="max-w-2xl">
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
          <Field label="Sales code">
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

// ------------------- Products -------------------

function ProductsPanel() {
  const [rows, setRows] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("products").select("*").order("code");
    setRows((data as Product[]) ?? []);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Product deleted");
      void load();
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Products</CardTitle>
        <Button
          size="sm"
          onClick={() => {
            setEditing({ id: "", code: "", description: "", unit: "" });
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add product
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-6 text-sm text-muted-foreground">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="py-6 text-sm text-muted-foreground">No products yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="py-2 pr-4">Code</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">Unit</th>
                  <th className="py-2 w-24"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="border-b border-border">
                    <td className="py-2 pr-4 font-mono text-xs">{p.code}</td>
                    <td className="py-2 pr-4">{p.description}</td>
                    <td className="py-2 pr-4">{p.unit}</td>
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
          void load();
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
    if (!form.code.trim() || !form.description.trim() || !form.unit.trim()) {
      toast.error("Code, description, and unit are required");
      return;
    }
    setSaving(true);
    const payload = { code: form.code, description: form.description, unit: form.unit };
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
      <DialogContent>
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
          <Field label="Unit *">
            <Input
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="e.g. kg, box, ea"
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
