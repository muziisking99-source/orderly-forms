-- Profiles, order ownership, PDF path, and authenticated-only RLS

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Backfill profiles for any existing auth users
INSERT INTO public.profiles (id, display_name)
SELECT id, email
FROM auth.users
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Prevent authenticated users from flipping is_admin (set via SQL as postgres instead)
CREATE OR REPLACE FUNCTION public.protect_profile_is_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.is_admin IS DISTINCT FROM OLD.is_admin THEN
    NEW.is_admin := OLD.is_admin;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_is_admin ON public.profiles;
CREATE TRIGGER protect_profile_is_admin
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_is_admin();

-- ---------------------------------------------------------------------------
-- Orders: ownership + PDF path
-- ---------------------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pdf_path TEXT;

CREATE INDEX IF NOT EXISTS orders_user_id_created_at_idx
  ON public.orders (user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Drop open public policies
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public full access to customers" ON public.customers;
DROP POLICY IF EXISTS "Public full access to products" ON public.products;
DROP POLICY IF EXISTS "Public full access to orders" ON public.orders;
DROP POLICY IF EXISTS "Public full access to order_items" ON public.order_items;

-- ---------------------------------------------------------------------------
-- Revoke anon access (invite-only app)
-- ---------------------------------------------------------------------------
REVOKE ALL ON public.customers FROM anon;
REVOKE ALL ON public.products FROM anon;
REVOKE ALL ON public.orders FROM anon;
REVOKE ALL ON public.order_items FROM anon;
REVOKE USAGE ON SEQUENCE public.order_document_seq FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT USAGE ON SEQUENCE public.order_document_seq TO authenticated;

-- ---------------------------------------------------------------------------
-- Customers / products: shared read, admin write
-- ---------------------------------------------------------------------------
CREATE POLICY "Authenticated can read customers"
  ON public.customers FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert customers"
  ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update customers"
  ON public.customers FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE TO authenticated
  USING (public.is_admin());

CREATE POLICY "Authenticated can read products"
  ON public.products FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------------
-- Orders: private to owner
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can read own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own orders"
  ON public.orders FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Order items: via parent order ownership
-- ---------------------------------------------------------------------------
CREATE POLICY "Users can read own order items"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own order items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own order items"
  ON public.order_items FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own order items"
  ON public.order_items FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Storage: private order PDFs under {user_id}/{order_id}.pdf
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'order-pdfs',
  'order-pdfs',
  false,
  10485760,
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Users can upload own order pdfs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'order-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can read own order pdfs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'order-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update own order pdfs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'order-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'order-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own order pdfs"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'order-pdfs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
