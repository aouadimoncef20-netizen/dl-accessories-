import { create } from "zustand";

// ─── Static Products ──────────────────────────────────────────────────────────────
const ALL_PRODUCTS = [
  // ── Watches ──
  { id: 1,  name: "Classic Gold Watch",         category: "Watches",   category_id: 6,  price: 299,                                              image: "https://picsum.photos/seed/gold-watch/400/500",     featured: true,  new_arrival: true,  best_seller: true,  stock: 15 },
  { id: 2,  name: "Silver Minimalist Watch",    category: "Watches",   category_id: 6,  price: 199, sale_price: 159, discount: 20,                   image: "https://picsum.photos/seed/silver-watch/400/500",    featured: true,  new_arrival: true,                       stock: 20 },
  { id: 3,  name: "Rose Gold Chronograph",       category: "Watches",   category_id: 6,  price: 349,                                              image: "https://picsum.photos/seed/rose-watch/400/500",     featured: true,                                    stock: 10 },

  // ── Bracelets ──
  { id: 4,  name: "Gold Chain Bracelet",         category: "Bracelets", category_id: 1,  price: 89,                                               image: "https://picsum.photos/seed/gold-bracelet/400/500",   featured: true,  new_arrival: true,                       stock: 25 },
  { id: 5,  name: "Pearl Beaded Bracelet",       category: "Bracelets", category_id: 1,  price: 59,                                               image: "https://picsum.photos/seed/pearl-bracelet/400/500",                            best_seller: true,  stock: 30 },
  { id: 6,  name: "Silver Cuff Bracelet",        category: "Bracelets", category_id: 1,  price: 79,                                               image: "https://picsum.photos/seed/cuff-bracelet/400/500",                              stock: 18 },

  // ── Rings ──
  { id: 7,  name: "Diamond Solitaire Ring",       category: "Rings",     category_id: 4,  price: 499,                                              image: "https://picsum.photos/seed/diamond-ring/400/500",    featured: true,                         best_seller: true,  stock: 8  },
  { id: 8,  name: "Gold Band Ring",              category: "Rings",     category_id: 4,  price: 129, sale_price: 99,  discount: 23,                   image: "https://picsum.photos/seed/gold-band-ring/400/500",                             stock: 22 },
  { id: 9,  name: "Rose Gold Stacking Ring",     category: "Rings",     category_id: 4,  price: 99,                                               image: "https://picsum.photos/seed/stacking-ring/400/500",                new_arrival: true,                       stock: 15 },

  // ── Earrings ──
  { id: 10, name: "Crystal Drop Earrings",        category: "Earrings",  category_id: 2,  price: 69,                                               image: "https://picsum.photos/seed/crystal-earrings/400/500", featured: true,  new_arrival: true,                       stock: 20 },
  { id: 11, name: "Gold Hoop Earrings",          category: "Earrings",  category_id: 2,  price: 49,                                               image: "https://picsum.photos/seed/gold-hoop/400/500",                               best_seller: true,  stock: 35 },
  { id: 12, name: "Pearl Stud Earrings",         category: "Earrings",  category_id: 2,  price: 39,                                               image: "https://picsum.photos/seed/pearl-stud/400/500",                                stock: 28 },

  // ── Necklaces ──
  { id: 13, name: "Gold Pendant Necklace",        category: "Necklaces", category_id: 5,  price: 159,                                              image: "https://picsum.photos/seed/pendant-necklace/400/500",featured: true,                         best_seller: true,  stock: 12 },
  { id: 14, name: "Pearl Strand Necklace",       category: "Necklaces", category_id: 5,  price: 199,                                              image: "https://picsum.photos/seed/pearl-necklace/400/500",               new_arrival: true,                       stock: 10 },
  { id: 15, name: "Silver Chain Necklace",       category: "Necklaces", category_id: 5,  price: 89,                                               image: "https://picsum.photos/seed/silver-necklace/400/500",                             stock: 18 },

  // ── Nails ──
  { id: 16, name: "Crystal Press-On Nails",       category: "Nails",                    price: 35,                                               image: "https://picsum.photos/seed/crystal-nails/400/500",   featured: true,  new_arrival: true,                       stock: 40 },
  { id: 17, name: "French Tip Press-On Nails",   category: "Nails",                    price: 29, sale_price: 24,  discount: 17,                   image: "https://picsum.photos/seed/french-nails/400/500",                             best_seller: true,  stock: 50 },
  { id: 18, name: "Velvet Finish Press-On Nails", category: "Nails",                    price: 32,                                               image: "https://picsum.photos/seed/velvet-nails/400/500",                               stock: 35 },

  // ── Lashes ──
  { id: 19, name: "Wispy Lash Extensions",        category: "Lashes",                   price: 45,                                               image: "https://picsum.photos/seed/wispy-lashes/400/500",   featured: true,  new_arrival: true,                       stock: 25 },
  { id: 20, name: "Volume Lash Clusters",        category: "Lashes",                   price: 55, sale_price: 44,  discount: 20,                   image: "https://picsum.photos/seed/volume-lashes/400/500",                             best_seller: true,  stock: 20 },
];

// ── Orders stored locally ──
let localOrders = [];
try {
  const raw = localStorage.getItem("dl_orders");
  if (raw) localOrders = JSON.parse(raw);
} catch {}

function persistOrders() {
  localStorage.setItem("dl_orders", JSON.stringify(localOrders));
}

// ── Helper ──
function matches(product, filters) {
  const catFilter = filters.category || filters.categoryId;
  if (catFilter) {
    const catId = Number(catFilter);
    if (!isNaN(catId) && product.category_id !== catId) return false;
    if (isNaN(catId) && product.category !== catFilter) return false;
  }
  if (filters.isBestseller && !product.best_seller) return false;
  if (filters.minPrice && product.price < Number(filters.minPrice)) return false;
  if (filters.maxPrice && product.price > Number(filters.maxPrice)) return false;
  if (filters.search && !product.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
  return true;
}

function sortProducts(list, sortBy) {
  const sorted = [...list];
  switch (sortBy) {
    case "price-asc":  return sorted.sort((a, b) => a.price - b.price);
    case "price-desc": return sorted.sort((a, b) => b.price - a.price);
    case "rating":     return sorted;
    case "newest":     return sorted.sort((a, b) => b.id - a.id);
    case "oldest":     return sorted.sort((a, b) => a.id - b.id);
    default:           return sorted;
  }
}

// ── Store ──
const useProductStore = create((set, get) => ({
  products: [],
  featured: [],
  newArrivals: [],
  categories: [],
  loading: false,
  error: null,

  fetchProducts: async (filters = {}) => {
    set({ loading: true, error: null });

    // Simulate async load
    await new Promise((r) => setTimeout(r, 200));

    let result = ALL_PRODUCTS.filter((p) => matches(p, filters));
    if (filters.sortBy) result = sortProducts(result, filters.sortBy);

    // Pagination
    if (filters.page && filters.perPage) {
      const from = (filters.page - 1) * filters.perPage;
      result = result.slice(from, from + filters.perPage);
    }

    set({ products: result, loading: false });
    return { data: result, count: result.length };
  },

  fetchFeatured: async () => {
    set({ featured: ALL_PRODUCTS.filter((p) => p.featured).slice(0, 8), loading: false });
  },

  fetchNewArrivals: async () => {
    set({ newArrivals: ALL_PRODUCTS.filter((p) => p.new_arrival).slice(0, 8), loading: false });
  },

  fetchCategories: async () => {
    const cats = [...new Set(ALL_PRODUCTS.map((p) => p.category))].map((name, i) => ({
      id: i + 1,
      name,
    }));
    set({ categories: cats });
  },

  fetchById: async (id) => {
    return ALL_PRODUCTS.find((p) => p.id === Number(id)) || null;
  },

  fetchRelated: async (category, excludeId, limit = 4) => {
    return ALL_PRODUCTS.filter((p) => p.category === category && p.id !== Number(excludeId)).slice(0, limit);
  },

  // Orders (local storage)
  createOrder: async (order) => {
    const newOrder = { ...order, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    localOrders.unshift(newOrder);
    persistOrders();
    return newOrder;
  },

  fetchUserOrders: async (userId) => {
    return localOrders.filter((o) => o.user_id === userId).sort((a, b) => b.created_at?.localeCompare(a.created_at));
  },

  fetchAllOrders: async () => {
    return [...localOrders].sort((a, b) => b.created_at?.localeCompare(a.created_at));
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
