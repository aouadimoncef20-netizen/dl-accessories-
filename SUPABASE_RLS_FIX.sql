-- ============================================================
-- RUN THIS IN YOUR SUPABASE SQL EDITOR
-- (Supabase Dashboard → SQL Editor → New Query → Paste & Run)
--
-- Your app uses localStorage auth (not Supabase Auth), so
-- Supabase sees all requests as "anon". This policy allows
-- anonymous full access to the products table.
-- ============================================================

-- 1. Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 2. Drop any old conflicting policies on products
DROP POLICY IF EXISTS "Anyone can view products" ON products;
DROP POLICY IF EXISTS "Authenticated users can insert products" ON products;
DROP POLICY IF EXISTS "Authenticated users can update products" ON products;
DROP POLICY IF EXISTS "Authenticated users can delete products" ON products;

-- 3. Allow full access (your app uses localStorage auth, not Supabase Auth)
CREATE POLICY "Allow all product operations"
  ON products
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
