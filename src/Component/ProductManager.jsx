import { useEffect, useState } from "react";
import useProductStore from "../stores/productStore";
import { useToast } from "../Contexts/ToastContext";

const EMPTY_FORM = {
  name: "",
  price: "",
  category: "",
  image_url: "",
  description: "",
};

function ProductManager() {
  const { products, fetchProducts, createProduct, deleteProduct, loading } =
    useProductStore();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filtered = products.filter(
    (p) =>
      p.name?.toLowerCase().includes(filter.toLowerCase()) ||
      p.category?.toLowerCase().includes(filter.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      toast.error("Enter a valid price");
      return;
    }

    setSubmitting(true);
    const { data, error } = await createProduct(form);

    if (error) {
      toast.error(error);
    } else {
      toast.success(`"${data.name}" added to inventory`);
      setForm(EMPTY_FORM);
      fetchProducts();
    }
    setSubmitting(false);
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) {
      return;
    }

    const { error } = await deleteProduct(product.id);
    if (error) {
      toast.error(error);
    } else {
      toast.success(`"${product.name}" removed`);
      fetchProducts();
    }
  };

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* ── Insert form ── */}
      <div className="lg:col-span-5">
        <div className="bg-surface rounded-3xl p-6 md:p-8 soft-glow sticky top-6">
          <h2 className="font-headline-sm text-headline-sm mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              add_box
            </span>
            New Product
          </h2>
          <p className="font-label-sm text-secondary mb-6">
            Fill in the details below to add a product to the store.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-label-sm text-secondary uppercase tracking-wider mb-1.5">
                Name *
              </label>
              <input
                type="text"
                className="form-input w-full"
                placeholder="e.g. Vintage Chronograph"
                value={form.name}
                onChange={setField("name")}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-label-sm text-secondary uppercase tracking-wider mb-1.5">
                  Price (USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input w-full"
                  placeholder="0.00"
                  value={form.price}
                  onChange={setField("price")}
                />
              </div>
              <div>
                <label className="block font-label-sm text-secondary uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <input
                  type="text"
                  className="form-input w-full"
                  placeholder="e.g. Watches"
                  value={form.category}
                  onChange={setField("category")}
                />
              </div>
            </div>

            <div>
              <label className="block font-label-sm text-secondary uppercase tracking-wider mb-1.5">
                Image URL
              </label>
              <input
                type="url"
                className="form-input w-full"
                placeholder="https://..."
                value={form.image_url}
                onChange={setField("image_url")}
              />
            </div>

            <div>
              <label className="block font-label-sm text-secondary uppercase tracking-wider mb-1.5">
                Description
              </label>
              <textarea
                rows={3}
                className="form-input w-full resize-none"
                placeholder="Brief product description..."
                value={form.description}
                onChange={setField("description")}
              />
            </div>

            {form.image_url && (
              <div className="rounded-xl overflow-hidden border border-outline-variant/20 bg-surface-container-low">
                <img
                  src={form.image_url}
                  alt="Preview"
                  className="w-full h-40 object-cover"
                  onError={(e) => (e.target.style.display = "none")}
                />
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-label-md uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 ripple"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                  Adding…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[20px]">
                    add
                  </span>
                  Add Product
                </span>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── Product list ── */}
      <div className="lg:col-span-7">
        <div className="bg-surface rounded-3xl p-6 md:p-8 soft-glow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">
                inventory_2
              </span>
              Inventory
              <span className="ml-2 px-2.5 py-0.5 rounded-full bg-primary-container/30 text-primary font-label-sm text-xs">
                {products.length}
              </span>
            </h2>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
                search
              </span>
              <input
                type="text"
                className="form-input pl-9 pr-4 py-2.5 text-sm w-full sm:w-56"
                placeholder="Filter products…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>

          {loading && products.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="font-body-md text-secondary">Loading inventory…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-outline-variant mb-3 block">
                {filter ? "search_off" : "inventory_2"}
              </span>
              <p className="font-body-md text-secondary">
                {filter
                  ? `No products match "${filter}"`
                  : "No products yet. Add one to get started."}
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-low hover:bg-surface-container transition-colors group"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/20">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-secondary text-xl">
                          image
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-body-md text-on-surface truncate">
                      {product.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-label-sm text-primary font-semibold">
                        ${product.price?.toFixed(2)}
                      </span>
                      {product.category && (
                        <>
                          <span className="text-outline-variant text-xs">•</span>
                          <span className="font-label-sm text-secondary truncate">
                            {product.category}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(product)}
                    className="p-2.5 rounded-xl text-secondary hover:bg-error-container hover:text-on-error-container transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete product"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      delete
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductManager;
