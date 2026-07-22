-- Allow free-text quantities on order line items (e.g. "2 boxes", "TBC")
-- Drop numeric check BEFORE type change (text > numeric would fail during ALTER)
ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS order_items_quantity_check;

ALTER TABLE public.order_items
  ALTER COLUMN quantity TYPE TEXT USING quantity::text;

ALTER TABLE public.order_items
  ADD CONSTRAINT order_items_quantity_not_empty CHECK (length(trim(quantity)) > 0);
