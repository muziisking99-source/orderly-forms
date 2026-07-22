-- Preserve product display order from spreadsheet import
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

-- Backfill existing rows in current creation order
WITH ranked AS (
  SELECT id, (ROW_NUMBER() OVER (ORDER BY created_at ASC, code ASC) - 1)::int AS rn
  FROM public.products
)
UPDATE public.products p
SET sort_order = ranked.rn
FROM ranked
WHERE p.id = ranked.id;

CREATE INDEX IF NOT EXISTS products_sort_order_idx ON public.products (sort_order);
