import { supabase } from "@/integrations/supabase/client";

export const queryKeys = {
  customers: ["customers"] as const,
  products: ["products"] as const,
  productsCatalog: ["products", "catalog"] as const,
  myOrders: ["orders", "mine"] as const,
  order: (id: string) => ["order", id] as const,
  orderItems: (orderId: string) => ["orderItems", orderId] as const,
  profile: (id: string) => ["profile", id] as const,
};

export type CustomerRow = {
  id: string;
  name: string;
  account_code: string | null;
  delivery_address: string | null;
  sales_code: string | null;
};

export type ProductRow = {
  id: string;
  code: string;
  description: string;
  unit: string;
  sort_order?: number;
};

export type ProductCatalogRow = {
  id: string;
  code: string;
  description: string;
  sort_order?: number;
};

export type OrderRow = {
  id: string;
  document_number: string;
  order_date: string;
  customer_name: string;
  account_code: string | null;
  delivery_address: string | null;
  reference: string | null;
  sales_code: string | null;
  user_id: string | null;
  pdf_path: string | null;
  created_at?: string;
};

export type OrderListRow = {
  id: string;
  document_number: string;
  order_date: string;
  customer_name: string;
  account_code: string | null;
  pdf_path: string | null;
  created_at: string;
};

export type OrderItemRow = {
  id: string;
  product_code: string;
  product_description: string;
  quantity: string;
  price: string | null;
  position: number;
};

export async function fetchCustomers(): Promise<CustomerRow[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("id,name,account_code,delivery_address,sales_code")
    .order("name");
  if (error) throw error;
  return (data as CustomerRow[]) ?? [];
}

export async function fetchProducts(): Promise<ProductRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });
  if (error) throw error;
  return (data as ProductRow[]) ?? [];
}

export async function fetchProductsCatalog(): Promise<ProductCatalogRow[]> {
  const { data, error } = await supabase
    .from("products")
    .select("id,code,description,sort_order")
    .order("sort_order", { ascending: true })
    .order("code", { ascending: true });
  if (error) throw error;
  return (data as ProductCatalogRow[]) ?? [];
}

export async function fetchMyOrders(): Promise<OrderListRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id,document_number,order_date,customer_name,account_code,pdf_path,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as OrderListRow[]) ?? [];
}

export async function fetchOrder(id: string): Promise<OrderRow | null> {
  const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as OrderRow | null;
}

export async function fetchOrderItems(orderId: string): Promise<OrderItemRow[]> {
  const { data, error } = await supabase
    .from("order_items")
    .select("id,product_code,product_description,quantity,price,position")
    .eq("order_id", orderId)
    .order("position");
  if (error) throw error;
  return (data as OrderItemRow[]) ?? [];
}
