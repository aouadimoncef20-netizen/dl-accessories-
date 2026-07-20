-- =============================================
-- DL Accessories — Supabase Database Schema
-- Run this in the Supabase SQL Editor
-- =============================================

-- 1. Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL,
  brand TEXT DEFAULT 'DL Accessories',
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2),
  images JSONB DEFAULT '[]',
  sizes JSONB DEFAULT '[]',
  colors JSONB DEFAULT '[]',
  stock INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  is_new BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  shipping_address JSONB NOT NULL,
  items JSONB NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  shipping_cost DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  tax DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending',
  order_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name TEXT,
  user_avatar TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. User profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  default_address JSONB,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Discount codes
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_percent INTEGER,
  discount_amount DECIMAL(10,2),
  min_order_amount DECIMAL(10,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  max_uses INTEGER,
  current_uses INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Order statuses
CREATE TABLE IF NOT EXISTS order_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id);

-- =============================================
-- Seed: Insert categories
-- =============================================
INSERT INTO categories (name, slug) VALUES
  ('Watches', 'watches'),
  ('Bracelets', 'bracelets'),
  ('Rings', 'rings'),
  ('Earrings', 'earrings'),
  ('Les Parures', 'les-parures'),
  ('Press-On Nails', 'press-on-nails'),
  ('False Lashes', 'false-lashes')
ON CONFLICT (slug) DO NOTHING;

-- =============================================
-- RLS Policies
-- =============================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE discount_codes ENABLE ROW LEVEL SECURITY;

-- Products: public read, admin write
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

-- Orders: users see own, admin sees all
CREATE POLICY "Users view own orders" ON orders FOR SELECT
  USING (auth.uid() = user_id);

-- Reviews: public read
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);

-- Profiles: users manage own
CREATE POLICY "Users manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

-- =============================================
-- Storage buckets (create via Supabase dashboard)
-- =============================================
-- products — product images
-- categories — category images
-- gallery — editorial/gallery images
-- avatars — user avatars

-- Storage policies
-- Run these for each bucket via SQL:
-- CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'products');
-- CREATE POLICY "Public read" ON storage.objects FOR SELECT USING (bucket_id = 'categories');
