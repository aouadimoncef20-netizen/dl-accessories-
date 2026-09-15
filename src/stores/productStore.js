import { create } from "zustand";
import supabase from "../lib/supabase";

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
    stock: row.stock ?? 0,
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
  createProduct: async ({ name, price, category, image_url, description, stock, best_seller, featured, new_arrival }) => {
    try {
      const payload = {
        name,
        price: Number(price),
        category: category || null,
        image_url: image_url || null,
        description: description || null,
        stock: Number(stock) || 0,
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
  //  ORDERS — Now stored in Supabase (not localStorage)
  // ══════════════════════════════════════════════

  // ── Create order ──
  createOrder: async (order) => {
    try {
      const payload = {
        user_id: order.user_id || null,
        customer_name: order.customer_name,
        phone: order.phone || null,
        address: order.address || null,
        state: order.state || null,
        items: JSON.stringify(order.items || []),
        total: Number(order.total) || 0,
        status: order.status || "pending",
      };

      const { data, error } = await supabase
        .from("orders")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Parse items back to array for the response
      const result = {
        ...data,
        items: typeof data.items === "string" ? JSON.parse(data.items) : data.items,
      };

      return result;
    } catch (err) {
      // Fallback to localStorage if Supabase fails
      const fallbackOrder = {
        ...order,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };
      try {
        const raw = localStorage.getItem("dl_orders");
        const localOrders = raw ? JSON.parse(raw) : [];
        localOrders.unshift(fallbackOrder);
        localStorage.setItem("dl_orders", JSON.stringify(localOrders));
      } catch {}
      return fallbackOrder;
    }
  },

  // ── Fetch user orders ──
  fetchUserOrders: async (userId) => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((o) => ({
        ...o,
        items: typeof o.items === "string" ? JSON.parse(o.items) : o.items,
      }));
    } catch (err) {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem("dl_orders");
        const localOrders = raw ? JSON.parse(raw) : [];
        return localOrders
          .filter((o) => o.user_id === userId || o.user_id === null)
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
        items: typeof o.items === "string" ? JSON.parse(o.items) : o.items,
      }));
    } catch (err) {
      // Fallback to localStorage
      try {
        const raw = localStorage.getItem("dl_orders");
        const localOrders = raw ? JSON.parse(raw) : [];
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
        const raw = localStorage.getItem("dl_orders");
        const localOrders = raw ? JSON.parse(raw) : [];
        const idx = localOrders.findIndex((o) => o.id === orderId);
        if (idx !== -1) {
          localOrders[idx] = { ...localOrders[idx], status };
          localStorage.setItem("dl_orders", JSON.stringify(localOrders));
        }
      } catch {}
      return { error: null };
    }
  },

  // ── Update order notes (admin) ──
  updateOrderNotes: async (orderId, notes) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ notes })
        .eq("id", orderId);

      if (error) throw error;
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  },

  // ── Decrement stock after order ──
  decrementStock: async (items) => {
    try {
      for (const item of items) {
        // Get current stock
        const { data: product } = await supabase
          .from("products")
          .select("stock")
          .eq("id", item.id)
          .single();

        if (product && product.stock > 0) {
          await supabase
            .from("products")
            .update({ stock: Math.max(0, product.stock - item.qty) })
            .eq("id", item.id);
        }
      }
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  },
}));

export default useProductStore;
