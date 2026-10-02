-- ============================================================
-- DL Accessories — Closing the database to strangers
-- ============================================================
--  RUN THIS LAST. Not before.
--
--  WHY THIS FILE EXISTS
--  The shop used to sign everyone in from the browser, which meant
--  every request reached the database as the `anon` role — the role
--  anyone gets from the public key that ships inside the website.
--  To make that work, the tables had to be wide open. In practice
--  that means anybody who viewed the page source could read every
--  customer's name, phone number and home address, and could edit or
--  delete your products and orders.
--
--  This file replaces those policies with ones that only work for a
--  signed-in account — and only yours can write.
--
--
--  ── READ THIS FIRST ───────────────────────────────────────
--
--  1. THE DATABASE MUST BE ONLINE (fix list A1) and the migration
--     run (A2). If it isn't, this file cannot help you.
--
--  2. CREATE YOUR ADMIN ACCOUNT IN SUPABASE FIRST.
--     Dashboard → Authentication → Users → Add user →
--         Email:    zaki1@dlaccessories.com
--         Password: (the one you chose)
--         ✓ Auto Confirm User
--     The email MUST match exactly — the policies below key off it.
--     Once this file is run, the built-in password in the app can
--     no longer write anything (it isn't a signed-in account), so
--     do not skip this step.
--
--  3. PRESS "SIGN OUT" IN THE APP, THEN SIGN BACK IN as the admin.
--     Do this BEFORE running this file, and confirm the dashboard
--     loads your products. Then run this file and reload the
--     dashboard. If products stop loading, re-run SUPABASE_SETUP.sql
--     to undo — nothing here is one-way.
--
--  4. Turn OFF "Confirm email" for this project
--     (Authentication → Sign In / Providers → Email) unless you have
--     set up SMTP. With it on, new customers create an account but
--     cannot sign in until they click a link that Supabase may never
--     deliver — the app falls back to the browser account, but you
--     want real accounts here.
--
--
--  ── WHAT CHANGES FOR CUSTOMERS ────────────────────────────
--
--  • Browsing, guest checkout and cash-on-delivery still work for
--    anyone, signed in or not.
--  • Order tracking still works for guests: the new lookup_order()
--    function below needs BOTH the order number and the phone number
--    used, and returns only that one order.
--  • "My Orders" now needs a real account. A customer whose account
--    only ever lived in one browser will see it empty until they
--    sign up properly — their old orders are still safe.
--
--  Safe to run more than once.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. Remove every existing policy on these tables
--    (their names differ depending on which setup file you ran,
--     so we drop them by looking them up rather than guessing)
-- ────────────────────────────────────────────────────────────
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname, tablename
      FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename IN ('products', 'orders')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;


-- ────────────────────────────────────────────────────────────
-- 2. PRODUCTS — everyone can look, only the admin can change
-- ────────────────────────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- The shop window. Without this the storefront shows nothing.
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

-- Prices, stock and photos are yours alone.
CREATE POLICY "Only the admin changes products"
  ON products FOR ALL
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com');


-- ────────────────────────────────────────────────────────────
-- 3. ORDERS
--    Place an order: anyone (guest checkout, cash on delivery).
--    Read an order:   the customer who placed it, or you.
--    Change status:   you.
-- ────────────────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can place an order"
  ON orders FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Customers and admin read orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    user_id::text = auth.uid()::text
    OR (auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com'
  );

CREATE POLICY "Only the admin updates orders"
  ON orders FOR UPDATE
  TO authenticated
  USING ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com');


-- ────────────────────────────────────────────────────────────
-- 4. ORDER TRACKING FOR GUESTS
--    Guests have no account, so they cannot read the orders table.
--    This function hands back ONE order to someone who already
--    knows both the order number and the phone number it was placed
--    with — the two things only the customer has.
--    It never returns the phone number back to the caller.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION lookup_order(p_reference TEXT, p_phone TEXT)
RETURNS TABLE (
  id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  total NUMERIC,
  items JSONB,
  customer_name TEXT,
  address TEXT,
  state TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.id,
         o.status,
         o.created_at,
         o.total,
         o.items,
         o.customer_name,
         o.address,
         o.state
    FROM orders o
   WHERE o.phone_digits = regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
     AND o.phone_digits <> ''
     AND replace(o.id::text, '-', '') ILIKE
         regexp_replace(lower(coalesce(p_reference, '')), '^(dl-?)?|[\W_]', '', 'g') || '%'
   ORDER BY o.created_at DESC
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lookup_order(TEXT, TEXT) TO anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- 5. PRODUCT IMAGES
--    Everyone can see them (the storefront needs that). Only your
--    account can add, replace or delete them.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Anon upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Anon update product images" ON storage.objects;
DROP POLICY IF EXISTS "Anon delete product images" ON storage.objects;

-- Postgres will not let you UPDATE or DELETE a row that your SELECT
-- policy hides, so the admin has to be able to SEE these rows too.
-- Without this policy you can upload a new photo but never replace or
-- remove one — the API answers "Access denied".
DROP POLICY IF EXISTS "Admin reads product images" ON storage.objects;
CREATE POLICY "Admin reads product images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com'
  );

DROP POLICY IF EXISTS "Admin uploads product images" ON storage.objects;
CREATE POLICY "Admin uploads product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com'
  );

DROP POLICY IF EXISTS "Admin updates product images" ON storage.objects;
CREATE POLICY "Admin updates product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com'
  )
  WITH CHECK (
    bucket_id = 'product-images'
    AND (auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com'
  );

DROP POLICY IF EXISTS "Admin deletes product images" ON storage.objects;
CREATE POLICY "Admin deletes product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com'
  );


-- ────────────────────────────────────────────────────────────
-- 6. Check it worked
--    Run this on its own afterwards. You want:
--      products  → one SELECT for anon, one ALL for authenticated
--      orders    → SELECT, INSERT, UPDATE, no DELETE
--    If a row says `anon` can UPDATE orders, something is wrong.
-- ────────────────────────────────────────────────────────────
-- SELECT tablename, policyname, cmd, roles
--   FROM pg_policies
--  WHERE schemaname = 'public' AND tablename IN ('products', 'orders')
--  ORDER BY tablename, cmd;
