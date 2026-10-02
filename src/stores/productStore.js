import { create } from "zustand";
import supabase from "../lib/supabase";
import {
  parseColors,
  parseSizes,
  phoneDigits,
  serializeColors,
  serializeSizes,
} from "../lib/productOptions";

/** Order items are JSONB, but an older row may still hold them as a string. */
function parseItems(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

/** Orders written while the database was unreachable, kept in this browser. */
function readLocalOrders() {
  try {
    const raw = localStorage.getItem("dl_orders");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// ── Helper: map Supabase row → ProductCard-friendly shape ──
function mapProduct(row) {
  const img = row.image_url;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    image: img,
    images: img ? [img] : [],
    description: row.description,
    // A number when the database knows it; `null` when it doesn't (no stock
    // column, or never set). `null` deliberately means "don't block" — an
    // unknown figure must never be read as "sold out" on the storefront.
    stock: typeof row.stock === "number" ? row.stock : null,
    // Real colours/sizes from the database. Empty means the product page
    // hides the selector rather than inventing options (see ProductDetails).
    colors: parseColors(row.colors),
    sizes: parseSizes(row.sizes),
    best_seller: row.best_seller,
    featured: row.featured,
    new_arrival: row.new_arrival,
  };
}

// ── Store ──
const useProductStore = create((set, get) => ({
  products: [],
  featured: [],
  newArrivals: [],
  categories: [],
  loading: false,
  error: null,

  // ── Fetch products with filters, sort & pagination ──
  fetchProducts: async (filters = {}) => {
    set({ loading: true, error: null });

    try {
      let query = supabase.from("products").select("*");

      const catFilter = filters.category || filters.categoryId;
      if (catFilter) {
        query = query.ilike("category", `%${catFilter}%`);
      }

      if (filters.isBestseller) {
        query = query.eq("best_seller", true);
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
        case "newest":
          query = query.order("created_at", { ascending: false });
          break;
        case "oldest":
          query = query.order("created_at", { ascending: true });
          break;
        default:
          break;
      }

      if (filters.page && filters.perPage) {
        const from = (filters.page - 1) * filters.perPage;
        const to = from + filters.perPage - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;

      if (error) {
        set({ error: error.message, loading: false, products: [] });
        return { data: [], count: 0 };
      }

      const products = (data || []).map(mapProduct);
      set({ products, loading: false });
      return { data: products, count: products.length };
    } catch (err) {
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
          if (seen.has(r.category)) return false;
          seen.add(r.category);
          return true;
        })
        .map((r, i) => ({ id: i + 1, name: r.category }));

      set({ categories });
    } catch (err) {
      set({ categories: [] });
    }
  },

  // ── Create product (admin) ──
  createProduct: async ({ name, price, category, image_url, description, stock, best_seller, featured, new_arrival, colors, sizes }) => {
    try {
      const payload = {
        name,
        price: Number(price),
        category: category || null,
        image_url: image_url || null,
        description: description || null,
        stock: Number(stock) || 0,
        colors: serializeColors(colors),
        sizes: serializeSizes(sizes),
      };

      let result = await supabase
        .from("products")
        .insert({
          ...payload,
          best_seller: best_seller ?? false,
          featured: featured ?? false,
          new_arrival: new_arrival ?? false,
        })
        .select()
        .single();

      if (result.error) {
        result = await supabase
          .from("products")
          .insert(payload)
          .select()
          .single();
      }

      // If the colors/sizes columns are missing, still save the product
      if (result.error) {
        const { colors: _c, sizes: _s, ...core } = payload;
        result = await supabase.from("products").insert(core).select().single();
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
      const payload = {
        name: updates.name,
        price: Number(updates.price),
        category: updates.category || null,
        image_url: updates.image_url || null,
        description: updates.description || null,
        stock: Number(updates.stock) || 0,
        colors: serializeColors(updates.colors),
        sizes: serializeSizes(updates.sizes),
      };

      let result = await supabase
        .from("products")
        .update({
          ...payload,
          best_seller: updates.best_seller ?? false,
          featured: updates.featured ?? false,
          new_arrival: updates.new_arrival ?? false,
        })
        .eq("id", id)
        .select()
        .single();

      if (result.error) {
        result = await supabase
          .from("products")
          .update(payload)
          .eq("id", id)
          .select()
          .single();
      }

      // If the colors/sizes columns are missing, still save the rest
      if (result.error) {
        const { colors: _c, sizes: _s, ...core } = payload;
        result = await supabase
          .from("products")
          .update(core)
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
        .ilike("category", `%${category}%`)
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

    try {
      // Try with the digits-only phone (it powers the customer's own
      // order lookup on /track-order).
      let result = await supabase
        .from("orders")
        .insert({ ...payload, phone_digits: phoneDigits(order.phone) })
        .select()
        .single();

      // Database predates that column — place the order anyway.
      if (result.error) {
        result = await supabase.from("orders").insert(payload).select().single();
      }

      if (result.error) throw result.error;

      const data = result.data;
      return {
        ...data,
        items: parseItems(data.items),
        saved: true,
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
  fetchAllOrders: async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
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
        return [...localOrders].sort(
          (a, b) => b.created_at?.localeCompare(a.created_at)
        );
      } catch {
        return [];
      }
    }
  },

  // ── Update order status ──
  updateOrderStatus: async (orderId, status) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      // Fallback to localStorage
      try {
        const localOrders = readLocalOrders();
        const idx = localOrders.findIndex((o) => o.id === orderId);
        if (idx !== -1) {
          localOrders[idx] = { ...localOrders[idx], status };
          localStorage.setItem("dl_orders", JSON.stringify(localOrders));
        }
      } catch {}
      return { error: null };
    }
  },

  // ── Decrement stock after order ──
  // Uses the atomic `decrement_product_stock` function from the migration so
  // two orders landing together can't both read the old number and oversell.
  // Falls back to read-then-write when that function isn't installed yet —
  // slower, and only right for one order at a time, but better than nothing.
  decrementStock: async (items) => {
    const problems = [];

    for (const item of items) {
      try {
        const { error } = await supabase.rpc("decrement_product_stock", {
          p_id: item.id,
          p_qty: item.qty,
        });

        if (!error) continue;

        // Function missing (migration not run) → do it the old way.
        const { data: product } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.id)
          .single();

        if (product && typeof product.stock === "number" && product.stock > 0) {
          await supabase
            .from("products")
            .update({ stock: Math.max(0, product.stock - item.qty) })
            .eq("id", item.id);
        }
      } catch (err) {
        // Stock is best-effort — never fail a placed order over it.
        problems.push({ id: item.id, reason: err?.message || String(err) });
      }
    }

    return { error: problems.length ? "Some stock could not be updated." : null, problems };
  },
}));

export default useProductStore;
