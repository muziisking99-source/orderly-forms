-- Optional display category for product grouping in the catalog.
-- When null, the app falls back to a label inferred from the product code.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN public.products.category IS
  'Catalog group label. Null means infer from product code.';
