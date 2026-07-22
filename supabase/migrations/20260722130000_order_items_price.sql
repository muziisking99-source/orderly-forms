-- Optional free-text price on order line items
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS price TEXT;
