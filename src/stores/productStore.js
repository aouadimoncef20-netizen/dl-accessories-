import { create } from "zustand";
import { supabase } from "../lib/supabase";

const useProductStore = create((set, get) => ({
  products: [],
  featured: [],
  newArrivals: [],
  categories: [],
  loading: false,
  error: null,

  // Generic query builder
  query: (table) => supabase.from(table),

  fetchProducts: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      let query = supabase.from("products").select("*");

      if (filters.category) query = query.eq("category", filters.category);
      if (filters.is_featured) query = query.eq("is_featured", true);
      if (filters.is_new) query = query.eq("is_new", true);
      if (filters.minPrice) query = query.gte("price", filters.minPrice);
      if (filters.maxPrice) query = query.lte("price", filters.maxPrice);
      if (filters.search) query = query.ilike("name", `%${filters.search}%`);

      // Sorting
      if (filters.sortBy === "price-asc") query = query.order("price", { ascending: true });
      else if (filters.sortBy === "price-desc") query = query.order("price", { ascending: false });
      else if (filters.sortBy === "rating") query = query.order("rating", { ascending: false });
      else if (filters.sortBy === "newest") query = query.order("created_at", { ascending: false });
      else if (filters.sortBy === "oldest") query = query.order("created_at", { ascending: true });
      else query = query.order("created_at", { ascending: false });

      // Pagination
      if (filters.page && filters.perPage) {
        const from = (filters.page - 1) * filters.perPage;
        const to = from + filters.perPage - 1;
        query = query.range(from, to);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ products: data || [], loading: false });
      return { data, count: data?.length || 0 };
    } catch (err) {
      set({ error: err.message, loading: false });
      return { data: [], count: 0 };
    }
  },

  fetchFeatured: async () => {
    set({ loading: true });
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_featured", true)
      .limit(8);
    set({ featured: data || [], loading: false });
  },

  fetchNewArrivals: async () => {
    set({ loading: true });
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_new", true)
      .order("created_at", { ascending: false })
      .limit(8);
    set({ newArrivals: data || [], loading: false });
  },

  fetchCategories: async () => {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("name");
    if (data) set({ categories: data });
  },

  fetchById: async (id) => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data;
  },

  fetchBySlug: async (slug) => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("slug", slug)
      .single();
    if (error) return null;
    return data;
  },

  fetchRelated: async (category, excludeId, limit = 4) => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("category", category)
      .neq("id", excludeId)
      .limit(limit);
    return data || [];
  },

  fetchReviews: async (productId) => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    return data || [];
  },

  searchProducts: async (query) => {
    if (!query.trim()) return [];
    const { data } = await supabase
      .from("products")
      .select("*")
      .or(`name.ilike.%${query}%,category.ilike.%${query}%`)
      .limit(20);
    return data || [];
  },

  // Admin
  createProduct: async (product) => {
    const { data, error } = await supabase
      .from("products")
      .insert([product])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  updateProduct: async (id, updates) => {
    const { data, error } = await supabase
      .from("products")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteProduct: async (id) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) throw error;
  },

  // Orders
  createOrder: async (order) => {
    const { data, error } = await supabase
      .from("orders")
      .insert([order])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  fetchUserOrders: async (userId) => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return data || [];
  },

  fetchAllOrders: async () => {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });
    return data || [];
  },

  updateOrderStatus: async (orderId, status) => {
    const { error } = await supabase
      .from("orders")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) throw error;
  },
}));

export default useProductStore;
