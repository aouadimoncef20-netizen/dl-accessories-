import { useState, useEffect, useCallback } from "react";
import useProductStore from "../stores/productStore";

/**
 * useProducts — React hook for fetching products from the static product store.
 *
 * Usage:
 *   const { products, loading, error, refetch } = useProducts();
 *   const { products } = useProducts({ category: "Watches", sortBy: "price-asc" });
 *   const { product, loading } = useProducts({ id: 1 });
 *
 * Returns:
 *   products   – array of product objects (or single product if id is set)
 *   product    – single product object (only when id filter is used)
 *   loading    – boolean
 *   error      – string or null
 *   refetch    – function to re-fetch
 */
export default function useProducts(filters = {}) {
  const [products, setProducts] = useState([]);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const {
    fetchProducts,
    fetchFeatured,
    fetchNewArrivals,
    fetchById,
  } = useProductStore();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Single product by ID
      if (filters.id) {
        const data = await fetchById(filters.id);
        setProduct(data);
        setProducts(data ? [data] : []);
        setLoading(false);
        return;
      }

      // By category
      if (filters.categoryId) {
        const { data } = await fetchProducts({ category: filters.categoryId });
        setProducts(data);
        setLoading(false);
        return;
      }

      // Featured
      if (filters.featured) {
        await fetchFeatured();
        const state = useProductStore.getState();
        setProducts(state.featured);
        setLoading(false);
        return;
      }

      // Best sellers
      if (filters.bestSeller) {
        const { data } = await fetchProducts({ isBestseller: true });
        setProducts(data);
        setLoading(false);
        return;
      }

      // New arrivals
      if (filters.newArrival) {
        await fetchNewArrivals();
        const state = useProductStore.getState();
        setProducts(state.newArrivals);
        setLoading(false);
        return;
      }

      // All products with optional filters
      const { data } = await fetchProducts(filters);
      setProducts(data);
    } catch (err) {
      setError(err.message || "Failed to load products.");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.id,
    filters.categoryId,
    filters.featured,
    filters.bestSeller,
    filters.newArrival,
    filters.search,
    filters.sortBy,
    filters.page,
    filters.perPage,
    filters.minPrice,
    filters.maxPrice,
    fetchProducts,
    fetchFeatured,
    fetchNewArrivals,
    fetchById,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { products, product, loading, error, refetch: fetchData };
}
