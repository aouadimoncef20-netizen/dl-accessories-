import { create } from "zustand";
import supabase from "../lib/supabase";
import {
  parseColors,
  parseSizes,
  parseVariants,
  phoneDigits,
  serializeColors,
  serializeSizes,
  serializeVariants,
  variantsTotalStock,
} from "../lib/productOptions";

/** Order items are JSONB, but an older row may still hold them as a string. */
function parseItems(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

/** The statuses the dashboard offers. Anything else is a typo, not a state. */
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

/** Orders written while the database was unreachable, kept in this browser. */
function readLocalOrders() {
  try {
    const raw = localStorage.getItem("dl_orders");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Turn the RPC's error strings into something the checkout can show without
 * leaking SQL detail. `OUT_OF_STOCK:` carries the product name after it.
 */
function orderErrorInfo(err) {
  const message = String(err?.message || err || "");
  if (err?.code === "PGRST202" || /could not find the function|schema cache/i.test(message)) {
    return { code: "rpc_missing" };
  }
  const stock = message.match(/OUT_OF_STOCK:([^\n]*)/);
  if (stock) return { code: "out_of_stock", name: stock[1].trim() };
  if (message.includes("COUPON_INVALID")) return { code: "coupon_invalid" };
  if (message.includes("COUPON_MIN_SUBTOTAL")) return { code: "coupon_min_subtotal" };
  if (message.includes("NO_DELIVERY_PRICE")) return { code: "no_delivery_price" };
  if (message.includes("NAME_REQUIRED")) return { code: "name_required" };
  if (message.includes("CART_EMPTY")) return { code: "cart_empty" };
  if (message.includes("PRODUCT_NOT_FOUND")) return { code: "product_not_found" };
  return { code: "unknown", message };
}

// ── Helper: map Supabase row → ProductCard-friendly shape ──
function mapProduct(row) {
  const img = row.image_url;
  const variants = parseVariants(row.variants);
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    // A promo price is a real price: when it is set and lower, it is what the
    // shop shows and charges. `price` stays the "was" figure.
    sale_price:
      typeof row.sale_price === "number" && row.sale_price > 0 && row.sale_price < row.price
        ? row.sale_price
        : null,
    is_pack: row.is_pack === true,
    image: img,
    images: img ? [img] : [],
    description: row.description,
    // A number when the database knows it; `null` when it doesn't (no stock
    // column, or never set). `null` deliberately means "don't block" — an
    // unknown figure must never be read as "sold out" on the storefront.
    //
    // When the product is sold colour by colour, the total is the sum of what
    // is really on the shelf — a stale hand-typed figure would otherwise
    // promise a bracelet in a colour that ran out.
    stock:
      variants.length > 0
        ? variantsTotalStock(variants)
        : typeof row.stock === "number"
          ? row.stock
          : null,
    // Real colours/sizes from the database. Empty means the product page
    // hides the selector rather than inventing options (see ProductDetails).
    colors: parseColors(row.colors),
    sizes: parseSizes(row.sizes),
    variants,
    best_seller: row.best_seller,
    featured: row.featured,
    new_arrival: row.new_arrival,
  };
}

// Every product read that replaces the shared list takes a ticket. Only the
// newest ticket may write. Without this, tapping two categories quickly lets
// the first (slower) answer land last and repaint the grid with the wrong
// products — and with a catalogue this size that read is slow enough to show.
let productRequestId = 0;

// ── Store ──
const useProductStore = create((set, get) => ({
  products: [],
  featured: [],
  newArrivals: [],
  categories: [],
  loading: false,
  error: null,
  // True once the whole catalogue has been pulled in (see fetchAllProducts).
  // The admin list needs every row to search, count and filter; the shop only
  // ever needs one page, so it never touches this.
  catalogueLoaded: false,
  // True when the last fetchAllOrders() fell back to this browser's copy
  // because the database refused the read (usually: not signed in as the
  // real admin). The dashboard shows a banner instead of pretending the
  // shop has no orders.
  ordersFromCache: false,

  // ── Fetch products with filters, sort & pagination ──
  fetchProducts: async (filters = {}) => {
    const requestId = ++productRequestId;
    set({ loading: true, error: null });

    try {
      // `count: "exact"` is the total number of rows the filters match, not
      // just the page we asked for — that is the figure the pagination needs.
      let query = supabase.from("products").select("*", { count: "exact" });

      const catFilter = filters.category || filters.categoryId;
      if (catFilter) {
        // An exact, case-insensitive match — NOT `%category%`. A substring
        // match made the "Rings" chip return every "Earrings" row as well
        // (they contain the word), so two categories were always mixed.
        query = query.ilike("category", catFilter);
      }

      if (filters.isBestseller) {
        query = query.eq("best_seller", true);
      }

      // On promotion = a sale price that is set and actually lower than the
      // list price. Postgres can't compare two columns through PostgREST, so
      // the query narrows to "has a sale price" and the final comparison is
      // made on the mapped rows below.
      if (filters.onSale) {
        query = query.not("sale_price", "is", null).gt("sale_price", 0);
      }

      if (filters.isPack) {
        query = query.eq("is_pack", true);
      }

      if (filters.minPrice) {
        query = query.gte("price", Number(filters.minPrice));
      }
      if (filters.maxPrice) {
        query = query.lte("price", Number(filters.maxPrice));
      }

      if (filters.search) {
        query = query.ilike("name", `%${filters.search}%`);
      }

      switch (filters.sortBy) {
        case "price-asc":
          query = query.order("price", { ascending: true });
          break;
        case "price-desc":
          query = query.order("price", { ascending: false });
          break;
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
        case "newest":
          query = query.order("created_at", { ascending: false, nullsFirst: false });
          break;
        default:
          // Newest first — deliberately, not by accident. Without an ORDER BY
          // Postgres returns rows in whatever order they sit on disk, so a
          // product added this morning appears on the *last* page of a
          // 200-product grid. The shop owner adds a product, opens
          // /collections, and doesn't see it. `id` breaks ties so two rows
          // saved in the same second can't swap places between pages.
          query = query
            .order("created_at", { ascending: false, nullsFirst: false })
            .order("id", { ascending: true });
          break;
      }

      // A hard cap for a strip or a preview ("up to 8 best sellers"). Applied
      // before `range` because a range already implies its own limit.
      if (filters.limit) {
        query = query.limit(Number(filters.limit));
      } else if (filters.page && filters.perPage) {
        const from = (filters.page - 1) * filters.perPage;
        const to = from + filters.perPage - 1;
        query = query.range(from, to);
      }

      const { data, error, count } = await query;

      // A newer read was started while this one was in flight — its answer is
      // the one on screen now, so this one is dropped instead of overwriting it.
      if (requestId !== productRequestId) return { data: [], count: 0 };

      if (error) {
        set({ error: error.message, loading: false, products: [] });
        return { data: [], count: 0 };
      }

      const products = (data || []).map(mapProduct);
      // The half of the "on promotion" test PostgREST can't do: the sale price
      // has to be strictly below the list price.
      const visible = filters.onSale
        ? products.filter((p) => typeof p.sale_price === "number")
        : products;
      // A row the query matched but this test rejected is still in `count`, so
      // take the rejects off it — otherwise the last page is a page of nothing.
      const rejected = products.length - visible.length;
      const total =
        typeof count === "number" ? Math.max(visible.length, count - rejected) : visible.length;
      set({ products: visible, loading: false });
      return { data: visible, count: total };
    } catch (err) {
      if (requestId !== productRequestId) return { data: [], count: 0 };
      set({ error: err.message, loading: false, products: [] });
      return { data: [], count: 0 };
    }
  },

  // ── Fetch the whole catalogue (admin) ──
  // PostgREST answers at most 1000 rows per request. A shop that grows past
  // that would quietly lose the tail of its catalogue — products that exist
  // but can never be found, edited or deleted in the dashboard. So this walks
  // the table a page at a time until every row is here.
  fetchAllProducts: async () => {
    const requestId = ++productRequestId;
    set({ loading: true, error: null });

    const PAGE = 1000;

    try {
      const rows = [];
      let from = 0;
      let total = null;

      for (;;) {
        const { data, error, count } = await supabase
          .from("products")
          .select("*", from === 0 ? { count: "exact" } : {})
          // A stable order is what makes paging safe: without it the database
          // is free to return rows in any order between requests.
          .order("created_at", { ascending: false, nullsFirst: false })
          .order("id", { ascending: true })
          .range(from, from + PAGE - 1);

        if (requestId !== productRequestId) return { data: [], count: 0 };
        if (error) throw error;

        if (from === 0 && typeof count === "number") total = count;

        const batch = data || [];
        if (batch.length === 0) break;
        rows.push(...batch);

        // Everything is here. `count` is the exact number of rows in the
        // table, so this finishes without one extra empty request.
        if (typeof total === "number" && rows.length >= total) break;

        // Step by what actually arrived, not by what was asked for: a database
        // with a lower row ceiling than our PAGE would otherwise skip the rows
        // between its ceiling and our stride.
        from += batch.length;

        // A runaway guard: no shop has fifty thousand products, and a broken
        // `count` must not spin here forever.
        if (from >= 50000) break;
      }

      const products = rows.map(mapProduct);
      set({ products, loading: false, catalogueLoaded: true });
      return { data: products, count: products.length };
    } catch (err) {
      if (requestId !== productRequestId) return { data: [], count: 0 };
      set({ error: err.message, loading: false, products: [] });
      return { data: [], count: 0 };
    }
  },

  // ── Featured products ──
  fetchFeatured: async () => {
    try {
      let { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("featured", true)
        .limit(8);

      if (error) {
        const fallback = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        set({ featured: [] });
        return;
      }
      set({ featured: (data || []).map(mapProduct) });
    } catch {
      set({ featured: [] });
    }
  },

  // ── New arrivals ──
  fetchNewArrivals: async () => {
    try {
      let { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("new_arrival", true)
        .limit(8);

      if (error) {
        const fallback = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(8);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        set({ newArrivals: [] });
        return;
      }
      set({ newArrivals: (data || []).map(mapProduct) });
    } catch {
      set({ newArrivals: [] });
    }
  },

  // ── Categories (distinct values from DB) ──
  fetchCategories: async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, category")
        .order("category");

      if (error) {
        set({ categories: [] });
        return;
      }

      const seen = new Set();
      const categories = (data || [])
        .filter((r) => {
          // "Watches" and "Watches " (a trailing space from a paste) are one
          // category in the shop, so they have to be one entry here too —
          // otherwise the admin's category filter splits the same shelf in two.
          const key = String(r.category || "").trim();
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .map((r, i) => ({ id: i + 1, name: String(r.category).trim() }));

      set({ categories });
    } catch (err) {
      set({ categories: [] });
    }
  },

  // ── Create product (admin) ──
  createProduct: async ({ name, price, sale_price, is_pack, category, image_url, description, stock, best_seller, featured, new_arrival, colors, sizes, variants }) => {
    try {
      const cleanVariants = serializeVariants(variants);
      const payload = {
        name,
        price: Number(price),
        category: category || null,
        image_url: image_url || null,
        description: description || null,
        // When the shop counts stock per colour and size, the total is the sum
        // of those rows — never a second number typed by hand that drifts.
        stock: cleanVariants.length ? variantsTotalStock(cleanVariants) : Number(stock) || 0,
        colors: serializeColors(colors),
        sizes: serializeSizes(sizes),
      };

      const promo = {
        ...(sale_price === undefined
          ? {}
          : { sale_price: sale_price ? Number(sale_price) : null }),
        ...(is_pack === undefined ? {} : { is_pack: is_pack === true }),
      };

      let result = await supabase
        .from("products")
        .insert({
          ...payload,
          ...(cleanVariants.length ? { variants: cleanVariants } : {}),
          ...promo,
          best_seller: best_seller ?? false,
          featured: featured ?? false,
          new_arrival: new_arrival ?? false,
        })
        .select()
        .single();

      // Colours, sizes, variants — each column may be missing on an older
      // project. Drop what it refuses, keep the product.
      if (result.error) {
        // No `variants` column: the grid cannot be stored, so the total is
        // the only stock figure this row will ever have.
        result = await supabase
          .from("products")
          .insert({ ...payload, ...promo, best_seller: best_seller ?? false, featured: featured ?? false, new_arrival: new_arrival ?? false })
          .select()
          .single();
      }

      if (result.error) {
        result = await supabase
          .from("products")
          .insert({ ...payload, ...promo })
          .select()
          .single();
      }

      // If the colors/sizes columns are missing, still save the product
      if (result.error) {
        const { colors: _c, sizes: _s, ...core } = payload;
        result = await supabase.from("products").insert(core).select().single();
      }

      // Last resort: the original six columns.
      if (result.error) {
        const { colors: _c, sizes: _s, ...core } = payload;
        const { sale_price: _sp, is_pack: _ip, ...plain } = core;
        result = await supabase.from("products").insert(plain).select().single();
      }

      if (result.error) throw result.error;

      const mapped = mapProduct(result.data);
      set((state) => ({
        products: [mapped, ...state.products],
      }));

      return { data: mapped, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },

  // ── Update product (admin) ──
  updateProduct: async (id, updates) => {
    try {
      const cleanVariants = serializeVariants(updates.variants);
      const payload = {
        name: updates.name,
        price: Number(updates.price),
        category: updates.category || null,
        image_url: updates.image_url || null,
        description: updates.description || null,
        stock: cleanVariants.length
          ? variantsTotalStock(cleanVariants)
          : Number(updates.stock) || 0,
        colors: serializeColors(updates.colors),
        sizes: serializeSizes(updates.sizes),
      };

      // `variants: []` is meaningful — it clears a product that used to be
      // counted by colour, so an emptied grid must be written, not skipped.
      const variantCol =
        updates.variants === undefined ? {} : { variants: cleanVariants };
      const promo = {
        ...(updates.sale_price === undefined
          ? {}
          : { sale_price: updates.sale_price ? Number(updates.sale_price) : null }),
        ...(updates.is_pack === undefined ? {} : { is_pack: updates.is_pack === true }),
      };

      const flags = {
        best_seller: updates.best_seller ?? false,
        featured: updates.featured ?? false,
        new_arrival: updates.new_arrival ?? false,
      };

      // A stock figure totalled from the grid is only true if the grid is
      // saved with it. When the database predates SUPABASE_UPGRADE.sql and
      // `variants` is not a column, the grid cannot be written — so leave the
      // stored stock alone rather than saving a total the row contradicts.
      const withoutDerivedStock = (obj) => {
        if (!cleanVariants.length) return obj;
        const { stock: _derived, ...rest } = obj;
        return rest;
      };

      let result = await supabase
        .from("products")
        .update({ ...payload, ...variantCol, ...promo, ...flags })
        .eq("id", id)
        .select()
        .single();

      // No `variants` column yet — save everything else.
      if (result.error) {
        result = await supabase
          .from("products")
          .update({ ...withoutDerivedStock(payload), ...promo, ...flags })
          .eq("id", id)
          .select()
          .single();
      }

      // No `colors`/`sizes` columns either — still save the rest.
      if (result.error) {
        const { colors: _c, sizes: _s, ...core } = payload;
        result = await supabase
          .from("products")
          .update({ ...withoutDerivedStock(core), ...promo, ...flags })
          .eq("id", id)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      const mapped = mapProduct(result.data);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? mapped : p)),
      }));

      return { data: mapped, error: null };
    } catch (err) {
      return { data: null, error: err.message };
    }
  },

  // ── Delete product (admin) ──
  deleteProduct: async (id) => {
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;

      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
      }));

      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  },

  // ── Single product by ID ──
  fetchById: async (id) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return null;
      }
      return mapProduct(data);
    } catch (err) {
      return null;
    }
  },

  // ── Related products ──
  fetchRelated: async (category, excludeId, limit = 4) => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .ilike("category", category)
        .neq("id", excludeId)
        .limit(limit);

      if (error) {
        return [];
      }
      return (data || []).map(mapProduct);
    } catch (err) {
      return [];
    }
  },

  // ══════════════════════════════════════════════
  //  ORDERS — kept in Supabase. If the database can't be reached we
  //  also keep a copy in this browser so nothing the customer typed is
  //  lost, and every read falls back to it.
  // ══════════════════════════════════════════════

  // ── Create order ──
  createOrder: async (order) => {
    // Preferred path: place_order() reads the real prices from `products`,
    // checks the stock, prices the delivery from `delivery_zones`, applies the
    // coupon and inserts + decrements in one transaction. The browser cannot
    // choose its own total.
    const rpcItems = (order.items || []).map((i) => ({
      id: i.id,
      qty: Number(i.qty) || 1,
      ...(i.variant ? { variant: i.variant } : {}),
      ...(i.color ? { color: i.color } : {}),
      ...(i.size ? { size: i.size } : {}),
    }));

    const rpcArgs = {
      p_customer_name: order.customer_name,
      p_phone: order.phone || null,
      p_address: order.address || null,
      p_state: order.state || null,
      p_commune: order.commune || null,
      p_wilaya_code: order.wilaya_code || null,
      p_delivery_type: order.delivery_type || null,
      p_mode: order.mode || "wilaya",
      p_reghaia_zone: order.reghaia_zone || null,
      p_items: rpcItems,
      p_coupon_code: order.coupon_code || null,
    };

    // The customer's message to the shop is the newest argument, so the
    // function may still be the 11-argument version. Try with it, and if the
    // database says there is no such function, place the order without it
    // rather than refusing a sale over a note.
    const withNote = order.customer_note
      ? await supabase.rpc("place_order", {
          ...rpcArgs,
          p_customer_note: order.customer_note,
        })
      : { data: null, error: { code: "PGRST202", message: "skipped" } };

    const noFunction = (err) =>
      err &&
      (err.code === "PGRST202" ||
        /could not find the function|schema cache/i.test(String(err.message || "")));

    const rpc = order.customer_note && !noFunction(withNote.error)
      ? withNote
      : await supabase.rpc("place_order", rpcArgs);

    const rpcData = rpc.data;
    const rpcError = rpc.error;

    if (!rpcError && rpcData) {
      return {
        ...rpcData,
        items: parseItems(rpcData.items),
        saved: true,
        stockHandled: true,
      };
    }

    const info = orderErrorInfo(rpcError);

    // A real business refusal (out of stock, bad coupon) must reach the
    // customer as an error — not be quietly written to this browser.
    if (rpcError && info.code !== "rpc_missing") {
      return {
        saved: false,
        code: info.code,
        error: info.code,
        errorName: info.name || "",
        offline: false,
        stockHandled: true,
      };
    }

    // ── Older database without place_order() — keep the old path ──
    const payload = {
      user_id: order.user_id || null,
      customer_name: order.customer_name,
      phone: order.phone || null,
      address: order.address || null,
      state: order.state || null,
      // `items` is a JSONB column — send the real array so Postgres stores
      // proper JSON (sending a stringified value double-encodes it).
      items: order.items || [],
      total: Number(order.total) || 0,
      status: order.status || "pending",
    };

    // What the customer typed for the shop. `notes` is the admin's own field,
    // so the customer's words get their own column — and if this database
    // predates it, the note falls back to `notes` further down.
    const note = order.customer_note ? { customer_note: order.customer_note } : {};

    // The courier's half of the order. DHD needs the commune and the
    // wilaya code as separate values, and whether it goes to the door
    // or to an office.
    const courier = {
      commune: order.commune || null,
      wilaya_code: order.wilaya_code || null,
      delivery_type: order.delivery_type || null,
    };

    try {
      // Try with the digits-only phone (it powers the customer's own
      // order lookup on /track-order).
      let result = await supabase
        .from("orders")
        .insert({ ...payload, ...note, ...courier, phone_digits: phoneDigits(order.phone) })
        .select()
        .single();

      // Database predates the courier columns — place the order anyway.
      // An order must never be lost because a migration hasn't run yet.
      if (result.error) {
        result = await supabase
          .from("orders")
          .insert({ ...payload, ...note, phone_digits: phoneDigits(order.phone) })
          .select()
          .single();
      }

      // Database predates the customer-note column — keep the message in the
      // admin's notes field so it still reaches the shop.
      if (result.error && order.customer_note) {
        result = await supabase
          .from("orders")
          .insert({
            ...payload,
            notes: order.customer_note,
            phone_digits: phoneDigits(order.phone),
          })
          .select()
          .single();
      }

      // Database predates that column too — place the order anyway.
      if (result.error) {
        result = await supabase.from("orders").insert(payload).select().single();
      }

      if (result.error) throw result.error;

      const data = result.data;
      return {
        ...data,
        items: parseItems(data.items),
        saved: true,
        stockHandled: false,
      };
    } catch (err) {
      // The order did NOT reach the database. Keep a copy in this browser so
      // the customer's details aren't lost, but report `saved: false` so the
      // UI can tell them the truth instead of showing a confirmation.
      console.error("[createOrder] Supabase insert failed:", err?.message || err);

      const fallbackOrder = {
        ...order,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        saved: false,
        offline: true,
        stockHandled: false,
      };
      try {
        const localOrders = readLocalOrders();
        localOrders.unshift(fallbackOrder);
        localStorage.setItem("dl_orders", JSON.stringify(localOrders));
      } catch {}
      return fallbackOrder;
    }
  },

  // ── Check a basket against live stock before the order is placed ──
  // Returns { ok, problems: [{ name, wanted, available }] }. If the database
  // can't be reached we return ok so the order attempt proceeds and fails
  // loudly in createOrder rather than blocking the customer with a false alarm.
  checkStock: async (items) => {
    try {
      const ids = [...new Set((items || []).map((i) => i.id).filter(Boolean))];
      if (!ids.length) return { ok: true, problems: [] };

      const { data, error } = await supabase
        .from("products")
        .select("id, name, stock")
        .in("id", ids);

      if (error) throw error;

      const byId = new Map((data || []).map((row) => [row.id, row]));
      const problems = [];

      for (const item of items) {
        const row = byId.get(item.id);
        if (!row) {
          problems.push({ name: item.name, wanted: item.qty, available: 0 });
          continue;
        }
        // No figure at all means "unknown", not "none" — never block on it.
        if (row.stock === null || row.stock === undefined) continue;

        const available = Number(row.stock);
        if (available < Number(item.qty)) {
          problems.push({
            name: row.name || item.name,
            wanted: Number(item.qty),
            available,
          });
        }
      }

      return { ok: problems.length === 0, problems };
    } catch (err) {
      console.warn("[checkStock] could not verify stock:", err?.message || err);
      return { ok: true, problems: [], unchecked: true };
    }
  },

  // ── Customer looks up their own order without an account ──
  // Needs BOTH the order reference (the DL-XXXXXXXX they were shown) and the
  // phone number used, so a bare phone number can't expose someone's address.
  // Returns a failure code, not a sentence — the page owns the wording and
  // can show it in the customer's own language.
  lookupOrder: async (reference, phone) => {
    const digits = phoneDigits(phone);
    const prefix = String(reference || "")
      .trim()
      .toLowerCase()
      .replace(/^dl-?/, "")
      .replace(/[^0-9a-f]/g, "");

    if (digits.length < 6) return { order: null, code: "need_phone" };
    if (prefix.length < 6) return { order: null, code: "need_reference" };

    try {
      // Preferred path: a database function that returns exactly one order to
      // someone who already knows both the number and the phone. It keeps
      // tracking working for guests after the orders table is locked down
      // (see SUPABASE_AUTH_LOCKDOWN.sql).
      const rpc = await supabase.rpc("lookup_order", {
        p_reference: prefix,
        p_phone: digits,
      });

      if (!rpc.error) {
        const row = Array.isArray(rpc.data) ? rpc.data[0] : rpc.data;
        if (!row) return { order: null, code: "not_found" };
        return {
          order: {
            ...row,
            items: parseItems(row.items),
          },
          code: null,
        };
      }

      // Older database without that function — read what we can.
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("phone_digits", digits)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      const match = (data || []).find((o) =>
        String(o.id).toLowerCase().startsWith(prefix)
      );

      if (!match) return { order: null, code: "not_found" };

      return {
        order: {
          ...match,
          items: parseItems(match.items),
        },
        code: null,
      };
    } catch (err) {
      console.warn("[lookupOrder] failed:", err?.message || err);
      return { order: null, code: "network" };
    }
  },

  // ── Fetch user orders ──
  fetchUserOrders: async (userId) => {
    if (!userId) return [];
    try {
      // Only this user's own orders. (Previously this also matched
      // user_id IS NULL, which leaked every guest order to all customers.)
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((o) => ({
        ...o,
        items: parseItems(o.items),
      }));
    } catch (err) {
      // Fallback to localStorage
      try {
        const localOrders = readLocalOrders();
        return localOrders
          .filter((o) => o.user_id === userId)
          .sort((a, b) => b.created_at?.localeCompare(a.created_at));
      } catch {
        return [];
      }
    }
  },

  // ── Fetch all orders (admin) ──
  // `ordersFromCache` tells the dashboard whether it is looking at the real
  // table or at this browser's leftover copy — a dashboard that silently shows
  // cached orders instead of today's orders is worse than one that says so.
  fetchAllOrders: async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      set({ ordersFromCache: false });
      return (data || []).map((o) => ({
        ...o,
        items: parseItems(o.items),
      }));
    } catch (err) {
      console.warn("[fetchAllOrders] falling back to this browser's copy:", err?.message || err);
      try {
        const localOrders = readLocalOrders();
        set({ ordersFromCache: true });
        return [...localOrders].sort(
          (a, b) => String(b.created_at || "").localeCompare(String(a.created_at || ""))
        );
      } catch {
        set({ ordersFromCache: true });
        return [];
      }
    }
  },

  // ── Update any field on an order (admin) ──
  // One function for status, address fixes and courier data, so the dashboard
  // gets a real error back instead of a silent no-op.
  updateOrder: async (orderId, updates) => {
    if (!orderId || !updates) return { error: "missing_order" };
    try {
      const { data, error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;

      return {
        error: null,
        order: data ? { ...data, items: parseItems(data.items) } : null,
      };
    } catch (err) {
      // Only orders this browser made while offline live here. A real order
      // that failed to update must report the failure — the admin needs to
      // know the customer's order did not actually change.
      const localOrders = readLocalOrders();
      const idx = localOrders.findIndex((o) => o.id === orderId);
      if (idx !== -1 && (localOrders[idx].local || localOrders[idx].offline)) {
        localOrders[idx] = { ...localOrders[idx], ...updates };
        try {
          localStorage.setItem("dl_orders", JSON.stringify(localOrders));
        } catch {}
        return { error: null, order: localOrders[idx], local: true };
      }

      return {
        error: "update_failed",
        message: err?.message || String(err),
      };
    }
  },

  updateOrderStatus: async (orderId, status) => {
    if (!ORDER_STATUSES.includes(status)) {
      return { error: "bad_status" };
    }
    return get().updateOrder(orderId, { status });
  },

  // ── Delete an order (admin: mistakes and test orders) ──
  deleteOrder: async (orderId) => {
    if (!orderId) return { error: "missing_order" };
    try {
      const { error } = await supabase.from("orders").delete().eq("id", orderId);
      if (error) throw error;
      return { error: null };
    } catch (err) {
      const localOrders = readLocalOrders().filter((o) => o.id !== orderId);
      try {
        localStorage.setItem("dl_orders", JSON.stringify(localOrders));
      } catch {}
      return { error: "delete_failed", message: err?.message || String(err) };
    }
  },

  // ── Decrement stock after order ──
  // Uses the atomic `decrement_product_stock` function so two orders landing
  // together can't both read the old number and oversell. The upgrade version
  // returns -1 when there isn't enough left; the checkout treats that as a
  // real problem instead of pretending the sale went through.
  //
  // Orders placed through place_order() already took the stock in the same
  // transaction — the checkout skips this call for those (`stockHandled`).
  decrementStock: async (items) => {
    const problems = [];

    for (const item of items) {
      try {
        const { data, error } = await supabase.rpc("decrement_product_stock", {
          p_id: item.id,
          p_qty: item.qty,
        });

        if (!error) {
          if (data === -1) {
            problems.push({ id: item.id, name: item.name, reason: "not_enough_stock" });
          }
          continue;
        }

        // Function missing (migration not run) → do it the old way, but never
        // below zero: clamping let two orders oversell the last item.
        const { data: product } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.id)
          .single();

        if (product && typeof product.stock === "number" && product.stock >= item.qty) {
          await supabase
            .from("products")
            .update({ stock: product.stock - item.qty })
            .eq("id", item.id);
        } else if (product && typeof product.stock === "number") {
          problems.push({
            id: item.id,
            name: item.name,
            reason: "not_enough_stock",
            available: product.stock,
          });
        }
      } catch (err) {
        // Stock is best-effort — never fail a placed order over it.
        problems.push({ id: item.id, name: item.name, reason: err?.message || String(err) });
      }
    }

    return {
      error: problems.length ? "Some stock could not be updated." : null,
      problems,
    };
  },
}));

export default useProductStore;
