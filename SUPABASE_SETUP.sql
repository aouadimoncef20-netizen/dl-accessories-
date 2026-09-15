-- ============================================================
-- DL Accessories — Full Database Setup
-- Run this in Supabase SQL Editor to create all required tables
-- ============================================================

-- 1. PRODUCTS TABLE (if not already exists)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  category TEXT,
  image_url TEXT,
  description TEXT,
  stock INTEGER DEFAULT 0,
  best_seller BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  new_arrival BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add stock column to existing products table (safe to run even if column exists)
DO $$ BEGIN
  ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT,
  customer_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  state TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. ENABLE RLS ON BOTH TABLES
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 4. DROP OLD POLICIES IF THEY EXIST
DROP POLICY IF EXISTS "Allow all product operations" ON products;
DROP POLICY IF EXISTS "Allow all order operations" ON orders;

-- 5. CREATE PERMISSIVE POLICIES (your app uses localStorage auth, not Supabase Auth)
CREATE POLICY "Allow all product operations"
  ON products FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all order operations"
  ON orders FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- 6. ENABLE REALTIME ON ORDERS (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
