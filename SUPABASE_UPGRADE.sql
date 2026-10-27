-- ============================================================
-- DL Accessories — the "make it complete" upgrade
-- ============================================================
-- RUN THIS LAST, after SUPABASE_SETUP.sql, SUPABASE_MIGRATION.sql
-- and SUPABASE_AUTH_LOCKDOWN.sql. Safe to run more than once.
--
-- It adds:
--   • the DHD columns and the two DHD lookup tables
--   • editable delivery prices (delivery_zones) and shop settings
--   • gallery images managed from the admin
--   • coupons / promo codes
--   • a server-side place_order() function that recalculates the
--     price and the stock itself, so a customer cannot post a fake
--     total or oversell the last item
--   • a strict stock decrement (returns -1 instead of clamping)
--   • the corrected lookup_order() with the courier tracking number
--   • admin-only delete on orders
--
-- The storefront keeps working if this file has not run yet: the
-- app falls back to the older insert path. Once it has run, the
-- secure RPC is the path orders take.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. The courier's half of an order
-- ────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS commune         TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wilaya_code     TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_type   TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dhd_status      TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dhd_sent_at     TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS dhd_error       TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS phone_digits    TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes           TEXT;

-- What the customer typed for the shop at checkout ("gift note", "call me
-- first"). Separate from `notes`, which is the admin's own reminder.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_note   TEXT;

-- ────────────────────────────────────────────────────────────
-- Products: promotions, packs, and stock counted per colour/size
-- ────────────────────────────────────────────────────────────
-- A promo is a second price, not a percentage: what the shop charges.
-- `price` stays the "was" figure the card strikes through.
ALTER TABLE products ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2);

-- "Sold as a set" — powers the Packs filter on the collections page.
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_pack BOOLEAN DEFAULT false;

-- One row per colour-and-size the shop actually sells:
--   [ {"color":"Red","size":"15","stock":9}, … ]
-- `stock` stays as their total, so anything that only asks "is there any
-- left?" keeps working unchanged.
ALTER TABLE products ADD COLUMN IF NOT EXISTS variants JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS orders_tracking_number_idx ON orders (tracking_number);
CREATE INDEX IF NOT EXISTS orders_status_created_idx  ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_phone_digits_idx    ON orders (phone_digits);

-- Keep phone_digits correct even when a row is written by hand or by
-- an older version of the app.
CREATE OR REPLACE FUNCTION set_order_phone_digits()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.phone_digits := regexp_replace(COALESCE(NEW.phone, ''), '\D', '', 'g');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_phone_digits_trigger ON orders;
CREATE TRIGGER orders_phone_digits_trigger
  BEFORE INSERT OR UPDATE OF phone ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_phone_digits();


-- ────────────────────────────────────────────────────────────
-- 2. The places DHD serves (filled by `npm run dhd:sync`)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dhd_wilayas (
  wilaya_id INT PRIMARY KEY,
  nom       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS dhd_communes (
  wilaya_id      INT  NOT NULL,
  nom            TEXT NOT NULL,
  code_postal    TEXT,
  has_stop_desk  BOOLEAN NOT NULL DEFAULT false,
  stop_desk_info JSONB,
  PRIMARY KEY (wilaya_id, nom)
);

CREATE INDEX IF NOT EXISTS dhd_communes_wilaya_idx ON dhd_communes (wilaya_id, nom);

ALTER TABLE dhd_wilayas ENABLE ROW LEVEL SECURITY;
ALTER TABLE dhd_communes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view dhd wilayas" ON dhd_wilayas;
CREATE POLICY "Anyone can view dhd wilayas"
  ON dhd_wilayas FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can view dhd communes" ON dhd_communes;
CREATE POLICY "Anyone can view dhd communes"
  ON dhd_communes FOR SELECT TO anon, authenticated USING (true);


-- ────────────────────────────────────────────────────────────
-- 3. Delivery prices the admin can edit
--    Two numbers per wilaya: what the courier charges to the
--    door, and what a stop-desk collection costs.
--    Seeded from the courier's printed card.
--
--    ON CONFLICT DO NOTHING means a re-run never overwrites a
--    price the admin has already changed. The one exception is
--    the old four-band placeholders (400/600/800/1200): those are
--    not real prices, so they are replaced by the card the first
--    time this file runs on an existing project.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS delivery_zones (
  wilaya_code TEXT PRIMARY KEY,
  price_dzd   NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- The stop-desk price. Added separately so an older project keeps working
-- while this file is being run.
ALTER TABLE delivery_zones ADD COLUMN IF NOT EXISTS stopdesk_dzd NUMERIC(10,2);

INSERT INTO delivery_zones (wilaya_code, price_dzd) VALUES
  ('01', 1100), ('02',  700), ('03',  900), ('04',  800), ('05',  800),
  ('06',  700), ('07',  900), ('08', 1100), ('09',  500), ('10',  650),
  ('11', 1300), ('12',  800), ('13',  800), ('14',  800), ('15',  650),
  ('16',  400), ('17',  900), ('18',  700), ('19',  700), ('20',  800),
  ('21',  700), ('22',  700), ('23',  800), ('24',  800), ('25',  700),
  ('26',  700), ('27',  700), ('28',  800), ('29',  700), ('30', 1000),
  ('31',  700), ('32', 1000), ('33', 1300), ('34',  700), ('35',  600),
  ('36',  800), ('37', 1300), ('38',  800), ('39',  900), ('40',  800),
  ('41',  800), ('42',  600), ('43',  700), ('44',  700), ('45', 1000),
  ('46',  700), ('47', 1000), ('48',  700), ('49', 1300), ('50',  900),
  ('51', 1300), ('52', 1300), ('53', 1300), ('54',  900), ('55',  900),
  ('56',  900), ('57', 1000), ('58', 1000)
ON CONFLICT (wilaya_code) DO UPDATE
  SET price_dzd  = EXCLUDED.price_dzd,
      updated_at = now()
  -- Only while the row is still one of the old four-band placeholders. A
  -- price the shop has since set by hand is left alone.
  WHERE delivery_zones.price_dzd IN (400, 600, 800, 1200);

-- Stop desk = door + 100 DZD, and + 150 DZD for Blida, Boumerdès and Tipaza
-- (the shop's own doorstep). NULL means "not set", never zero, so a re-run
-- can tell the difference between "nobody has said" and "it's free".
UPDATE delivery_zones
   SET stopdesk_dzd = price_dzd + CASE
         WHEN wilaya_code IN ('09', '35', '42') THEN 150
         ELSE 100
       END
 WHERE stopdesk_dzd IS NULL;

ALTER TABLE delivery_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view delivery prices" ON delivery_zones;
CREATE POLICY "Anyone can view delivery prices"
  ON delivery_zones FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Only the admin changes delivery prices" ON delivery_zones;
CREATE POLICY "Only the admin changes delivery prices"
  ON delivery_zones FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com');


-- ────────────────────────────────────────────────────────────
-- 4. Small shop settings
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO store_settings (key, value) VALUES
  ('reghaia_outskirts_dzd', '200'),
  ('free_delivery_over_dzd', '0')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view shop settings" ON store_settings;
CREATE POLICY "Anyone can view shop settings"
  ON store_settings FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Only the admin changes shop settings" ON store_settings;
CREATE POLICY "Only the admin changes shop settings"
  ON store_settings FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com');


-- ────────────────────────────────────────────────────────────
-- 5. Gallery images managed from the admin
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS gallery_images (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT,
  description TEXT,
  category    TEXT,
  image_url   TEXT NOT NULL,
  sort_order  INT DEFAULT 0,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view gallery images" ON gallery_images;
CREATE POLICY "Anyone can view gallery images"
  ON gallery_images FOR SELECT TO anon, authenticated
  USING (active = true);

DROP POLICY IF EXISTS "Only the admin changes gallery images" ON gallery_images;
CREATE POLICY "Only the admin changes gallery images"
  ON gallery_images FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com');


-- ────────────────────────────────────────────────────────────
-- 6. Coupons / promo codes
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  code         TEXT PRIMARY KEY,
  percent      NUMERIC(5,2),
  amount_dzd   NUMERIC(10,2),
  min_subtotal NUMERIC(10,2) DEFAULT 0,
  active       BOOLEAN DEFAULT true,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT coupons_one_kind CHECK (
    (percent IS NOT NULL AND amount_dzd IS NULL)
    OR (percent IS NULL AND amount_dzd IS NOT NULL)
  )
);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Deliberately NO public SELECT policy: the publishable key is in every page,
-- so a readable table would let anyone list every promo code. A customer who
-- knows a code can check it through check_coupon() below, and the admin can
-- read the whole table.
DROP POLICY IF EXISTS "Anyone can read active coupons" ON coupons;

DROP POLICY IF EXISTS "Only the admin changes coupons" ON coupons;
CREATE POLICY "Only the admin changes coupons"
  ON coupons FOR ALL TO authenticated
  USING ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com')
  WITH CHECK ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com');

-- Answers one question for one code: "is this valid, and how much is it
-- worth?" It cannot be used to enumerate codes.
CREATE OR REPLACE FUNCTION check_coupon(p_code TEXT, p_subtotal NUMERIC DEFAULT 0)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coupon RECORD;
BEGIN
  SELECT * INTO v_coupon
    FROM coupons
   WHERE upper(code) = upper(btrim(COALESCE(p_code, '')))
     AND active = true
     AND (expires_at IS NULL OR expires_at > now());

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF COALESCE(v_coupon.min_subtotal, 0) > COALESCE(p_subtotal, 0) THEN
    RETURN jsonb_build_object('error', 'COUPON_MIN_SUBTOTAL');
  END IF;

  RETURN jsonb_build_object(
    'code',       v_coupon.code,
    'percent',    v_coupon.percent,
    'amount_dzd', v_coupon.amount_dzd
  );
END;
$$;

GRANT EXECUTE ON FUNCTION check_coupon(TEXT, NUMERIC) TO anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- 7. Strict stock decrement
--    Returns the new stock, NULL when the product has no stock
--    figure, and -1 when there was not enough stock. The old
--    version clamped at zero, which let two orders oversell.
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION decrement_product_stock(p_id UUID, p_qty INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stock INT;
BEGIN
  IF p_qty IS NULL OR p_qty <= 0 THEN
    RETURN NULL;
  END IF;

  UPDATE products
     SET stock = stock - p_qty
   WHERE id = p_id
     AND stock IS NOT NULL
     AND stock >= p_qty
  RETURNING stock INTO v_stock;

  IF FOUND THEN
    RETURN v_stock;
  END IF;

  -- Distinguish "no stock figure" from "not enough stock".
  SELECT stock INTO v_stock FROM products WHERE id = p_id;
  IF v_stock IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN -1;
END;
$$;

-- Only the admin may call this. Stock is taken by place_order() inside the
-- order's transaction now, so nothing on the storefront needs it — leaving it
-- open to `anon` would let any visitor deplete a product by calling it in a
-- loop.
REVOKE ALL ON FUNCTION decrement_product_stock(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION decrement_product_stock(UUID, INT) TO authenticated;


-- ────────────────────────────────────────────────────────────
-- 8. Server-side order placement
--    The browser sends only what the customer chose: the product
--    ids, quantities, variants and delivery mode. This function
--    reads the prices from `products`, checks stock, prices the
--    delivery from `delivery_zones`, applies a coupon, inserts the
--    order and decrements stock in one transaction. If anything
--    fails, nothing is written.
-- ────────────────────────────────────────────────────────────
-- Both the old 11-argument version and the current one go: leaving the old
-- one in place would let Postgres pick it for a call without a note, and it
-- takes stock the old (non variant-aware) way.
DROP FUNCTION IF EXISTS place_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT);
DROP FUNCTION IF EXISTS place_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT);

CREATE FUNCTION place_order(
  p_customer_name TEXT,
  p_phone         TEXT,
  p_address       TEXT,
  p_state         TEXT,
  p_commune       TEXT,
  p_wilaya_code   TEXT,
  p_delivery_type TEXT,
  p_mode          TEXT,
  p_reghaia_zone  TEXT,
  p_items         JSONB,
  p_coupon_code   TEXT DEFAULT NULL,
  p_customer_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line        RECORD;
  v_stock_line  RECORD;
  v_product     RECORD;
  v_coupon      RECORD;
  v_items       JSONB := '[]'::jsonb;
  v_subtotal    NUMERIC := 0;
  v_shipping    NUMERIC := 0;
  v_discount    NUMERIC := 0;
  v_total       NUMERIC := 0;
  v_price       NUMERIC;
  v_qty         INT;
  v_zone_price  NUMERIC;
  v_desk_price  NUMERIC;
  v_outskirts   NUMERIC;
  v_free_over   NUMERIC;
  v_order       orders%ROWTYPE;
  v_wilaya      TEXT;
  v_color       TEXT;
  v_size        TEXT;
  v_vstock      INT;
BEGIN
  IF p_customer_name IS NULL OR btrim(p_customer_name) = '' THEN
    RAISE EXCEPTION 'NAME_REQUIRED';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'CART_EMPTY';
  END IF;
  IF p_mode NOT IN ('university', 'universite', 'reghaia', 'wilaya') THEN
    RAISE EXCEPTION 'BAD_MODE';
  END IF;

  -- ── Price every line from the database, not from the browser ──
  FOR v_line IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x(id UUID, qty INT, variant TEXT, color TEXT, size TEXT)
  LOOP
    v_qty := GREATEST(COALESCE(v_line.qty, 0), 0);
    IF v_qty = 0 THEN
      CONTINUE;
    END IF;

    SELECT id, name, price, sale_price, image_url, stock, variants
      INTO v_product
      FROM products
     WHERE id = v_line.id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', v_line.id;
    END IF;

    v_color := btrim(COALESCE(v_line.color, ''));
    v_size  := btrim(COALESCE(v_line.size, ''));

    -- When the shop counts this product colour by colour, the number that
    -- matters is the one for the exact pair the customer picked — the
    -- shop-wide total would happily sell a red 15 that ran out last week.
    IF v_product.variants IS NOT NULL
       AND jsonb_typeof(v_product.variants) = 'array'
       AND jsonb_array_length(v_product.variants) > 0
       AND (v_color <> '' OR v_size <> '') THEN

      SELECT (e->>'stock')::INT INTO v_vstock
        FROM jsonb_array_elements(v_product.variants) e
       WHERE lower(btrim(COALESCE(e->>'color', ''))) = lower(v_color)
         AND lower(btrim(COALESCE(e->>'size', '')))  = lower(v_size)
       LIMIT 1;

      IF v_vstock IS NULL OR v_vstock < v_qty THEN
        RAISE EXCEPTION 'OUT_OF_STOCK:%', v_product.name;
      END IF;

    ELSIF v_product.variants IS NOT NULL
       AND jsonb_typeof(v_product.variants) = 'array'
       AND jsonb_array_length(v_product.variants) > 0 THEN
      -- Counted by colour, ordered without naming one: what is on the shelf
      -- is the sum of the grid, not the total column, which lagged behind it.
      SELECT COALESCE(SUM(COALESCE((e->>'stock')::INT, 0)), 0)
        INTO v_vstock
        FROM jsonb_array_elements(v_product.variants) e;

      IF v_vstock < v_qty THEN
        RAISE EXCEPTION 'OUT_OF_STOCK:%', v_product.name;
      END IF;

    ELSIF v_product.stock IS NOT NULL AND v_product.stock < v_qty THEN
      RAISE EXCEPTION 'OUT_OF_STOCK:%', v_product.name;
    END IF;

    -- A promo price is the price: charge the lower of the two, so the number
    -- on the card is the number on the receipt. A sale price that is above
    -- the list price (or zero/blank) is ignored rather than trusted.
    v_price := COALESCE(v_product.price, 0);
    IF v_product.sale_price IS NOT NULL
       AND v_product.sale_price > 0
       AND v_product.sale_price < v_price THEN
      v_price := v_product.sale_price;
    END IF;
    v_subtotal := v_subtotal + (v_price * v_qty);

    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'id',      v_product.id,
      'name',    v_product.name,
      'price',   v_price,
      'qty',     v_qty,
      'image',   v_product.image_url,
      'variant', v_line.variant,
      'color',   NULLIF(v_color, ''),
      'size',    NULLIF(v_size, '')
    ));
  END LOOP;

  IF v_subtotal <= 0 THEN
    RAISE EXCEPTION 'CART_EMPTY';
  END IF;

  -- ── Delivery, from the same table the admin edits ──
  IF p_mode IN ('university', 'universite') THEN
    v_shipping := 0;

  ELSIF p_mode = 'reghaia' THEN
    IF p_reghaia_zone = 'outskirts' THEN
      SELECT NULLIF(btrim(value), '')::NUMERIC
        INTO v_outskirts
        FROM store_settings
       WHERE key = 'reghaia_outskirts_dzd';
      v_shipping := COALESCE(v_outskirts, 200);
    ELSE
      v_shipping := 0;
    END IF;

  ELSE
    v_wilaya := lpad(regexp_replace(COALESCE(p_wilaya_code, ''), '\D', '', 'g'), 2, '0');
    IF v_wilaya = '' OR v_wilaya = '00' THEN
      RAISE EXCEPTION 'NO_DELIVERY_PRICE';
    END IF;

    SELECT price_dzd, stopdesk_dzd INTO v_zone_price, v_desk_price
      FROM delivery_zones
     WHERE wilaya_code = v_wilaya;

    IF v_zone_price IS NULL THEN
      RAISE EXCEPTION 'NO_DELIVERY_PRICE:%', v_wilaya;
    END IF;

    -- The customer collects it from the courier's desk — a different price.
    -- An unset stop-desk price falls back to the card's rule rather than to
    -- zero, so a half-filled table can never make delivery free by accident.
    IF lower(COALESCE(p_delivery_type, '')) = 'bureau' THEN
      -- Same rule as the storefront (src/lib/shipping.js): +100 everywhere,
      -- +150 for the shop's own doorstep. If the two disagreed, the price on
      -- the confirmation would not be the price on the order.
      v_shipping := COALESCE(
        v_desk_price,
        v_zone_price + CASE WHEN v_wilaya IN ('09', '35', '42') THEN 150 ELSE 100 END
      );
    ELSE
      v_shipping := v_zone_price;
    END IF;

    -- The shop can promise free delivery over a threshold (Admin →
    -- Delivery). The checkout reads the same setting, so the server has to
    -- honour it too — otherwise the customer is shown 0 DZD and charged the
    -- zone price.
    SELECT NULLIF(btrim(value), '')::NUMERIC
      INTO v_free_over
      FROM store_settings
     WHERE key = 'free_delivery_over_dzd';

    IF COALESCE(v_free_over, 0) > 0 AND v_subtotal >= v_free_over THEN
      v_shipping := 0;
    END IF;
  END IF;

  -- ── Coupon (optional) ──
  IF p_coupon_code IS NOT NULL AND btrim(p_coupon_code) <> '' THEN
    SELECT * INTO v_coupon
      FROM coupons
     WHERE upper(code) = upper(btrim(p_coupon_code))
       AND active = true
       AND (expires_at IS NULL OR expires_at > now());

    IF NOT FOUND THEN
      RAISE EXCEPTION 'COUPON_INVALID';
    END IF;

    IF COALESCE(v_coupon.min_subtotal, 0) > v_subtotal THEN
      RAISE EXCEPTION 'COUPON_MIN_SUBTOTAL';
    END IF;

    IF v_coupon.percent IS NOT NULL THEN
      v_discount := ROUND(v_subtotal * (v_coupon.percent / 100.0), 2);
    ELSE
      v_discount := COALESCE(v_coupon.amount_dzd, 0);
    END IF;

    v_discount := LEAST(GREATEST(v_discount, 0), v_subtotal);
  END IF;

  v_total := GREATEST(0, v_subtotal - v_discount) + v_shipping;

  -- ── Write the order ──
  INSERT INTO orders (
    user_id, customer_name, phone, phone_digits, address, state,
    commune, wilaya_code, delivery_type, items, total, status, customer_note
  ) VALUES (
    auth.uid()::text,
    btrim(p_customer_name),
    NULLIF(btrim(COALESCE(p_phone, '')), ''),
    regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g'),
    NULLIF(btrim(COALESCE(p_address, '')), ''),
    NULLIF(btrim(COALESCE(p_state, '')), ''),
    NULLIF(btrim(COALESCE(p_commune, '')), ''),
    NULLIF(btrim(COALESCE(p_wilaya_code, '')), ''),
    NULLIF(btrim(COALESCE(p_delivery_type, '')), ''),
    v_items,
    v_total,
    'pending',
    NULLIF(btrim(COALESCE(p_customer_note, '')), '')
  )
  RETURNING * INTO v_order;

  -- ── Take the stock in the same transaction ──
  FOR v_stock_line IN
    SELECT * FROM jsonb_to_recordset(p_items)
      AS x(id UUID, qty INT, color TEXT, size TEXT)
  LOOP
    v_qty := GREATEST(COALESCE(v_stock_line.qty, 0), 0);
    IF v_qty = 0 THEN
      CONTINUE;
    END IF;

    v_color := btrim(COALESCE(v_stock_line.color, ''));
    v_size  := btrim(COALESCE(v_stock_line.size, ''));

    -- Counted by colour and size: take it off that exact row, then restate
    -- the total from what is left. Two orders landing together still can't
    -- oversell, because the whole thing is one transaction.
    IF (v_color <> '' OR v_size <> '')
       AND EXISTS (
         SELECT 1 FROM products
          WHERE id = v_stock_line.id
            AND variants IS NOT NULL
            AND jsonb_typeof(variants) = 'array'
            AND jsonb_array_length(variants) > 0
       ) THEN

      UPDATE products p
         SET variants = (
               SELECT jsonb_agg(
                        CASE
                          WHEN lower(btrim(COALESCE(e->>'color', ''))) = lower(v_color)
                           AND lower(btrim(COALESCE(e->>'size', '')))  = lower(v_size)
                          THEN jsonb_set(
                                 e,
                                 '{stock}',
                                 to_jsonb(GREATEST(COALESCE((e->>'stock')::INT, 0) - v_qty, 0))
                               )
                          ELSE e
                        END
                      )
                 FROM jsonb_array_elements(p.variants) e
             )
       WHERE p.id = v_stock_line.id;

      UPDATE products p
         SET stock = (
               SELECT COALESCE(SUM(COALESCE((e->>'stock')::INT, 0)), 0)
                 FROM jsonb_array_elements(p.variants) e
             )
       WHERE p.id = v_stock_line.id;

    ELSIF EXISTS (
      SELECT 1 FROM products
       WHERE id = v_stock_line.id
         AND variants IS NOT NULL
         AND jsonb_typeof(variants) = 'array'
         AND jsonb_array_length(variants) > 0
    ) THEN
      -- Counted by colour, but the line names no colour or size — a phone
      -- order typed straight into the dashboard. The goods still left the
      -- shelf, so take them off the grid, earliest combination first, and
      -- restate the total. Doing nothing here would leave a sold bracelet
      -- still advertised, and the next variant sale would overwrite
      -- products.stock from the untouched grid and hide the decrement for
      -- good.
      UPDATE products p
         SET variants = (
               SELECT jsonb_agg(
                        jsonb_set(g.elem, '{stock}', to_jsonb(g.left_stock::INT))
                        ORDER BY g.ord
                      )
                 FROM (
                   SELECT elem, ord,
                          GREATEST(
                            COALESCE((elem->>'stock')::INT, 0)
                            - GREATEST(
                                v_qty - COALESCE(
                                  SUM(COALESCE((elem->>'stock')::INT, 0))
                                    OVER (ORDER BY ord
                                          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),
                                  0),
                                0),
                            0
                          ) AS left_stock
                     FROM jsonb_array_elements(p.variants) WITH ORDINALITY AS t(elem, ord)
                 ) g
             )
       WHERE p.id = v_stock_line.id;

      UPDATE products p
         SET stock = (
               SELECT COALESCE(SUM(COALESCE((e->>'stock')::INT, 0)), 0)
                 FROM jsonb_array_elements(p.variants) e
             )
       WHERE p.id = v_stock_line.id;

    ELSE
      UPDATE products
         SET stock = stock - v_qty
       WHERE id = v_stock_line.id
         AND stock IS NOT NULL
         AND stock >= v_qty;

      IF NOT FOUND THEN
        -- A product with no stock figure is fine; a product that had
        -- one but no longer has enough rolls the whole order back.
        IF EXISTS (
          SELECT 1 FROM products
           WHERE id = v_stock_line.id AND stock IS NOT NULL
        ) THEN
          RAISE EXCEPTION 'OUT_OF_STOCK:%', v_stock_line.id;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN to_jsonb(v_order) || jsonb_build_object('saved', true);
END;
$$;

-- The new signature replaces the old one on an existing project.
GRANT EXECUTE ON FUNCTION place_order(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT)
  TO anon, authenticated;

-- Once place_order() exists, a browser no longer needs to insert
-- orders directly. Closing the old insert policy stops scripted
-- fake orders — the RPC is the only way in.
DROP POLICY IF EXISTS "Anyone can place an order" ON orders;


-- ────────────────────────────────────────────────────────────
-- 9. Customer order lookup, with the courier tracking number
--    This replaces the 8-column version from the lockdown file.
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
   WHERE o.phone_digits = regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g')
     AND o.phone_digits <> ''
     AND replace(o.id::text, '-', '') ILIKE
         regexp_replace(lower(COALESCE(p_reference, '')), '^(dl-?)?|[\W_]', '', 'g') || '%'
   ORDER BY o.created_at DESC
   LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION lookup_order(TEXT, TEXT) TO anon, authenticated;


-- ────────────────────────────────────────────────────────────
-- 10. Admin can delete an order (mistakes, test orders)
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Only the admin deletes orders" ON orders;
CREATE POLICY "Only the admin deletes orders"
  ON orders FOR DELETE TO authenticated
  USING ((auth.jwt() ->> 'email') = 'zaki1@dlaccessories.com');


-- ────────────────────────────────────────────────────────────
-- 11. Check it worked
-- ────────────────────────────────────────────────────────────
-- SELECT count(*) FROM delivery_zones;              -- 58
-- SELECT count(*) FROM dhd_wilayas;                 -- 55 after dhd:sync
-- SELECT count(*) FROM dhd_communes;                -- ~1500 after dhd:sync
-- SELECT proname FROM pg_proc WHERE proname IN ('place_order','decrement_product_stock','lookup_order');
-- SELECT tablename, policyname, cmd FROM pg_policies
--  WHERE tablename IN ('orders','delivery_zones','store_settings','gallery_images','coupons')
--  ORDER BY tablename, policyname;
