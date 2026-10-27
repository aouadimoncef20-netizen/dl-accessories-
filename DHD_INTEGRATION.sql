-- ============================================================
-- DL Accessories — DHD (Ecotrack) delivery integration
-- ============================================================
--  Run this AFTER SUPABASE_MIGRATION.sql and BEFORE the app is
--  rebuilt. Safe to run more than once.
--
--  WHAT THIS ADDS
--   • six columns on `orders` for the courier side of an order
--   • two read-only tables holding the places DHD actually
--     serves — wilayas and communes — so the checkout can offer
--     a commune dropdown without calling DHD on every page load
--
--  WHY THE TABLES ARE COPIED INSTEAD OF CALLED LIVE
--   DHD allows 50 calls a minute. One checkout per customer
--   would burn through that on a busy evening, and the dropdown
--   would go blank the moment their API hiccups. The lists
--   change rarely, so `npm run dhd:sync` copies them here once
--   and the shop reads them from our own database.
--
--  The delivery API token is NOT in this file and never goes in
--  the website. It lives only in the Edge Function's secrets.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. The courier's half of an order
--    All nullable: every order placed before today has none of
--    this, and a customer can still check out if DHD is down.
-- ────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commune        TEXT;
-- The official two-digit code ("16"), kept beside the label the
-- customer saw ("16 - Alger"). The courier's API wants the code,
-- and reading it from a text label is a guess we don't need to make.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wilaya_code    TEXT;
-- 'domicile' (to the door) or 'bureau' (customer collects)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type  TEXT;
-- The courier's own tracking number — what the customer quotes
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
-- 'created' | 'failed' — null means "not sent yet"
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dhd_status     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dhd_sent_at    TIMESTAMPTZ;
-- Why it failed, in DHD's words, so the admin can act on it
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dhd_error      TEXT;

-- The admin searches by tracking number when a customer rings
CREATE INDEX IF NOT EXISTS orders_tracking_number_idx ON orders (tracking_number);


-- ────────────────────────────────────────────────────────────
-- 2. The places DHD serves
--    Filled by `npm run dhd:sync`, never by hand.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dhd_wilayas (
  wilaya_id INT PRIMARY KEY,
  nom       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dhd_communes (
  wilaya_id      INT  NOT NULL,
  nom            TEXT NOT NULL,
  code_postal    TEXT,
  -- 1 when DHD has an office in this commune, so 'bureau'
  -- delivery can be offered here and nowhere else
  has_stop_desk  BOOLEAN NOT NULL DEFAULT false,
  -- the office: address, phones, opening hours (JSON from DHD)
  stop_desk_info JSONB,
  PRIMARY KEY (wilaya_id, nom)
);

CREATE INDEX IF NOT EXISTS dhd_communes_wilaya_idx ON dhd_communes (wilaya_id, nom);

-- The checkout reads these two with the public key that ships in
-- the site, exactly like it reads products. Read-only: nobody can
-- write to them from a browser.
ALTER TABLE dhd_wilayas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dhd_communes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view dhd wilayas"  ON dhd_wilayas;
CREATE POLICY "Anyone can view dhd wilayas"
  ON dhd_wilayas FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view dhd communes" ON dhd_communes;
CREATE POLICY "Anyone can view dhd communes"
  ON dhd_communes FOR SELECT
  TO anon, authenticated
  USING (true);


-- ────────────────────────────────────────────────────────────
-- 3. Let a guest see their tracking number
--    lookup_order() hands one order back to someone who knows
--    the order number AND the phone. It has to be rebuilt to
--    carry the new tracking_number column — Postgres will not
--    let a function's return type change in place, hence the
--    drop. Guests still get nothing but their own single order.
-- ────────────────────────────────────────────────────────────
DROP FUNCTION IF EXISTS lookup_order(TEXT, TEXT);

CREATE FUNCTION lookup_order(p_reference TEXT, p_phone TEXT)
RETURNS TABLE (
  id UUID,
  status TEXT,
  created_at TIMESTAMPTZ,
  total NUMERIC,
  items JSONB,
  customer_name TEXT,
  address TEXT,
  state TEXT,
  tracking_number TEXT
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
         o.state,
         o.tracking_number
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
-- 4. Check it worked. You want six new columns and two tables.
-- ────────────────────────────────────────────────────────────
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'orders' AND column_name LIKE 'dhd%'
--     OR (table_name='orders' AND column_name IN ('commune','delivery_type','tracking_number'));
-- SELECT count(*) FROM dhd_wilayas;    -- 55 once synced
-- SELECT count(*) FROM dhd_communes;   -- ~1500 once synced
