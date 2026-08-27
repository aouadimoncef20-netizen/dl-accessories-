import { create } from "zustand";
import supabase from "../lib/supabase";

// ── Orders stored locally (unchanged) ──
let localOrders = [];
try {
  const raw = localStorage.getItem("dl_orders");
  if (raw) localOrders = JSON.parse(raw);
} catch {}

function persistOrders() {
  localStorage.setItem("dl_orders", JSON.stringify(localOrders));
}

// ── Helper: map Supabase row → ProductCard‑friendly shape ──
function mapProduct(row) {
  const img = row.image_url;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    image: img,
    // detail pages expect an "images" array — populate it from the single URL
    images: img ? [img] : [],
    description: row.description,
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
      let query = supabase
        .from("products")
        .select("*");

      // ── Category filter (case-insensitive on the "category" text column) ──
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

      // ── Sort ──
      switch (filters.sortBy) {
        case "price-asc":
          query = query.order("price", { ascending: true });
          break;
        case "price-desc":
          query = query.order("price", { ascending: false });
          break;
        case "newest":
          query = query.order("id", { ascending: false });
          break;
        case "oldest":
          query = query.order("id", { ascending: true });
          break;
        default:
          break;
      }

      // ── Pagination ──
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
      // First try: filter by "featured" column if it exists
      let { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("featured", true)
        .limit(8);

      // Fallback: if the column doesn't exist, just grab the first 8 products
      if (error) {
        const fallback = await supabase
          .from("products")
          .select("*")
          .order("id", { ascending: false })
          .limit(8);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        set({ featured: [] });
        return;
      }
      set({ featured: (data || []).map(mapProduct) });
    } catch (err) {
      set({ featured: [] });
    }
  },

  // ── New arrivals ──
  fetchNewArrivals: async () => {
    try {
      // First try: filter by "new_arrival" column if it exists
      let { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("new_arrival", true)
        .limit(8);

      // Fallback: if the column doesn't exist, grab latest 8 by id
      if (error) {
        const fallback = await supabase
          .from("products")
          .select("*")
          .order("id", { ascending: false })
          .limit(8);
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        set({ newArrivals: [] });
        return;
      }
      set({ newArrivals: (data || []).map(mapProduct) });
    } catch (err) {
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
      // ilike with wildcards ensures case-insensitive matching
      // e.g. "Watches" matches "watches", "WATCHES", "Watches", etc.
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

  // ── Orders (local storage — unchanged) ──
  createOrder: async (order) => {
    const newOrder = {
      ...order,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    localOrders.unshift(newOrder);
    persistOrders();
    return newOrder;
  },

  fetchUserOrders: async (userId) => {
    return localOrders
      .filter((o) => o.user_id === userId)
      .sort((a, b) => b.created_at?.localeCompare(a.created_at));
  },

  fetchAllOrders: async () => {
    return [...localOrders].sort(
      (a, b) => b.created_at?.localeCompare(a.created_at)
    );
  },

  updateOrderStatus: async (orderId, status) => {
    const idx = localOrders.findIndex((o) => o.id === orderId);
    if (idx !== -1) {
      localOrders[idx] = { ...localOrders[idx], status };
      persistOrders();
    }
  },
}));

export default useProductStore;
