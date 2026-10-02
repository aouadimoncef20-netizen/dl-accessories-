-- ============================================================
-- DL Accessories — Migration
-- Run in Supabase Dashboard → SQL Editor → New Query → Run
-- Safe to run more than once.
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. Add the missing `new_arrival` column
--    (this was causing a 400 error on every page load)
-- ────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS new_arrival BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS featured    BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS best_seller BOOLEAN DEFAULT false;

-- Backfill so existing rows have a real value instead of NULL
UPDATE products SET new_arrival = false WHERE new_arrival IS NULL;
UPDATE products SET featured    = false WHERE featured    IS NULL;
UPDATE products SET best_seller = false WHERE best_seller IS NULL;


-- ────────────────────────────────────────────────────────────
-- 1b. Product options — colours and sizes
--     Without these the product pages invented their own:
--     every ring offered sizes 4-8 and every watch showed
--     three made-up colour swatches.
--
--     Stored as simple text arrays so they are easy to type
--     in the admin form and to read in the table editor:
--       colors -> ["Rose Gold:#B76E79", "Midnight Black:#1C1B1B"]
--       sizes  -> ["4", "5", "6", "7", "8"]
--
--     Empty array = the product page hides the selector
--     instead of showing options that do not exist.
-- ────────────────────────────────────────────────────────────
ALTER TABLE products ADD COLUMN IF NOT EXISTS colors JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS sizes  JSONB DEFAULT '[]'::jsonb;

-- 1c. Orders: digits-only phone, so a customer can look up
--     their own order without an account. Stored alongside the
--     phone they typed, because "0555 11 22 33" and
--     "0555112233" are the same number but not the same text.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone_digits TEXT;

-- Backfill existing orders from their phone column
UPDATE orders
   SET phone_digits = regexp_replace(phone, '\D', '', 'g')
 WHERE phone_digits IS NULL
   AND phone IS NOT NULL;

-- Powers the lookup and speeds up the admin's phone search
CREATE INDEX IF NOT EXISTS orders_phone_digits_idx ON orders (phone_digits);


-- ────────────────────────────────────────────────────────────
-- 2. Atomic stock decrement
--    The app used to read a product's stock, subtract, then write
--    it back. Two orders landing together both read the old number
--    and the later write wins — the shop oversells by one.
--
--    This does it in a single statement, which takes a row lock, so
--    concurrent orders queue up and each sees the other's result.
--    The old read-then-write stays in the app as a fallback for
--    when this function isn't installed yet.
--
--    SECURITY DEFINER so the anon role (a guest at checkout) can
--    call it without being able to UPDATE products directly.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_product_stock(p_id UUID, p_qty INT)
RETURNS INT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE products
     SET stock = GREATEST(0, COALESCE(stock, 0) - GREATEST(p_qty, 0))
   WHERE id = p_id
     AND stock IS NOT NULL
  RETURNING stock;
$$;

GRANT EXECUTE ON FUNCTION decrement_product_stock(UUID, INT) TO anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- 3. Storage bucket for product images
--    (the admin's image upload had nowhere to upload to)
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to VIEW product images (the storefront needs this)
DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  TO anon
  USING (bucket_id = 'product-images');

-- Allow the admin dashboard to UPLOAD product images
DROP POLICY IF EXISTS "Anon upload product images" ON storage.objects;
CREATE POLICY "Anon upload product images"
  ON storage.objects FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'product-images');

-- Allow replacing / deleting images
DROP POLICY IF EXISTS "Anon update product images" ON storage.objects;
CREATE POLICY "Anon update product images"
  ON storage.objects FOR UPDATE
  TO anon
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Anon delete product images" ON storage.objects;
CREATE POLICY "Anon delete product images"
  ON storage.objects FOR DELETE
  TO anon
  USING (bucket_id = 'product-images');
