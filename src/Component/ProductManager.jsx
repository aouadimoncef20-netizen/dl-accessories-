import { useEffect, useState, useCallback, useRef } from "react";
import useProductStore from "../stores/productStore";
import supabase from "../lib/supabase";
import { useToast } from "../Contexts/ToastContext";
import { formatDZD } from "../lib/currency";

const CATEGORY_OPTIONS = [
  "Watches",
  "Jewelry",
  "Bracelets",
  "Rings",
  "Earrings",
  "Necklaces",
  "Lashes",
  "Nails",
  "Bags",
  "Sunglasses",
  "Scarves",
  "Belts",
  "Wallets",
  "Accessories",
];

const EMPTY_FORM = {
  name: "",
  price: "",
  category: CATEGORY_OPTIONS[0],
  image_url: "",
  description: "",
  stock: "0",
  best_seller: false,
  featured: false,
  new_arrival: false,
};

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer group">
      <span className="font-label-sm text-secondary group-hover:text-on-surface transition-colors">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-surface-container-high"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}

function ProductManager() {
  const {
    products,
    categories,
    fetchProducts,
    fetchCategories,
    createProduct,
    updateProduct,
    deleteProduct,
    loading,
  } = useProductStore();
  const toast = useToast();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const allCategories = [
    ...new Set([
      ...CATEGORY_OPTIONS,
      ...(categories || []).map((c) => c.name),
    ]),
  ].sort();

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name?.toLowerCase().includes(filter.toLowerCase()) ||
      p.category?.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const isEditing = editingId !== null;

  // ── Image upload handler ──
  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);

    try {
      // Try uploading to Supabase Storage first
      const fileName = `products/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);

      if (!uploadError && uploadData) {
        // Get public URL
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
          setImageError(false);
          toast.success("Image uploaded successfully");
          setUploading(false);
          return;
        }
      }

      // Fallback: convert to base64 data URL for small images
      if (file.size > 1 * 1024 * 1024) {
        toast.error("Image upload failed. Please paste an image URL instead.");
        setUploading(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setForm((prev) => ({ ...prev, image_url: event.target.result }));
        setImageError(false);
        toast.success("Image loaded");
        setUploading(false);
      };
      reader.onerror = () => {
        toast.error("Failed to read image file");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error("Upload failed. Try pasting an image URL.");
      setUploading(false);
    }
  }, [toast]);

  const handleSubmit = useCallback(
    async (e) => {
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

      if (isEditing) {
        const { data, error } = await updateProduct(editingId, form);
        if (error) {
          const msg = error.includes("row-level security")
            ? "Permission denied — check Supabase RLS policies."
            : error;
          toast.error(msg);
        } else {
          toast.success(`"${data.name}" updated`);
          cancelEdit();
        }
      } else {
        const { data, error } = await createProduct(form);
        if (error) {
          const msg = error.includes("row-level security")
            ? "Permission denied — run the RLS fix SQL in your Supabase dashboard."
            : error;
          toast.error(msg);
        } else {
          toast.success(`"${data.name}" added`);
          setForm(EMPTY_FORM);
          setImageError(false);
          fetchCategories();
        }
      }

      setSubmitting(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, isEditing, editingId, createProduct, updateProduct, fetchCategories, toast]
  );

  const handleEdit = useCallback((product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      price: product.price?.toString() || "",
      category: product.category || CATEGORY_OPTIONS[0],
      image_url: product.image || "",
      description: product.description || "",
      stock: product.stock?.toString() || "0",
      best_seller: product.best_seller || false,
      featured: product.featured || false,
      new_arrival: product.new_arrival || false,
    });
    setImageError(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setImageError(false);
  }, []);

  const handleDelete = useCallback(
    async (product) => {
      setDeleteConfirm(null);
      if (editingId === product.id) cancelEdit();
      const { error } = await deleteProduct(product.id);
      if (error) {
        toast.error(error);
      } else {
        toast.success(`"${product.name}" removed`);
      }
    },
    [deleteProduct, editingId, cancelEdit, toast]
  );

  const setField = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (field === "image_url") setImageError(false);
  };

  const toggleField = (field) => (value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const categoryCount = (cat) => {
    if (cat === "all") return products.length;
    return products.filter((p) => p.category === cat).length;
  };

  const lowStockCount = products.filter((p) => p.stock <= 5 && p.stock > 0).length;
  const outOfStockCount = products.filter((p) => p.stock === 0).length;

  return (
    <div className="space-y-6">
      {/* ── Delete confirmation popup ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-inverse-surface/40 backdrop-blur-sm px-4">
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full soft-glow text-center">
            <div className="w-16 h-16 rounded-full bg-error-container/30 flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-[32px] text-error">delete_forever</span>
            </div>
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">Delete Product?</h3>
            <p className="font-body-md text-secondary mb-6">
              Are you sure you want to remove <span className="text-on-surface font-semibold">"{deleteConfirm.name}"</span>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl bg-surface-container text-secondary font-label-md hover:bg-surface-container-high transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 rounded-xl bg-error text-on-primary font-label-md hover:opacity-90 transition-opacity"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Stock alerts ── */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
              <span className="material-symbols-outlined text-[18px] text-red-600">error</span>
              <span className="font-label-sm text-red-700 dark:text-red-400">{outOfStockCount} out of stock</span>
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
              <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
              <span className="font-label-sm text-amber-700 dark:text-amber-400">{lowStockCount} low stock</span>
            </div>
          )}
        </div>
      )}

      {/* ── Add / Edit product form ── */}
      <div className="bg-surface rounded-2xl p-5 md:p-6 soft-glow">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              {isEditing ? "edit" : "add_box"}
            </span>
            {isEditing ? "Edit Product" : "Add New Product"}
          </h2>
          {isEditing && (
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 font-label-sm text-secondary hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
              Cancel
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left column - Basic info */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <label className="block font-label-sm text-secondary mb-1.5">Product Name *</label>
                <input
                  type="text"
                  className="form-input w-full"
                  placeholder="e.g. Classic Rose Gold Watch"
                  value={form.name}
                  onChange={setField("name")}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block font-label-sm text-secondary mb-1.5">Price (USD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-label-md">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-input w-full pl-7"
                      placeholder="0.00"
                      value={form.price}
                      onChange={setField("price")}
                    />
                  </div>
                  {form.price && Number(form.price) > 0 && (
                    <p className="text-[11px] text-primary mt-1">≈ {formatDZD(Number(form.price))}</p>
                  )}
                </div>
                <div>
                  <label className="block font-label-sm text-secondary mb-1.5">Stock *</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input w-full"
                    placeholder="0"
                    value={form.stock}
                    onChange={setField("stock")}
                  />
                  {Number(form.stock) === 0 && (
                    <p className="text-[11px] text-red-500 mt-1">Out of stock</p>
                  )}
                  {Number(form.stock) > 0 && Number(form.stock) <= 5 && (
                    <p className="text-[11px] text-amber-500 mt-1">Low stock</p>
                  )}
                </div>
                <div>
                  <label className="block font-label-sm text-secondary mb-1.5">Category</label>
                  <select
                    className="form-input w-full cursor-pointer"
                    value={form.category}
                    onChange={setField("category")}
                  >
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-label-sm text-secondary mb-1.5">Description</label>
                <textarea
                  className="form-input w-full resize-none"
                  rows={3}
                  placeholder="Brief description of the product..."
                  value={form.description}
                  onChange={setField("description")}
                />
              </div>

              {/* Tags */}
              <div className="bg-surface-container-low rounded-xl p-4 space-y-3">
                <p className="font-label-sm text-secondary uppercase tracking-wider mb-2">Product Tags</p>
                <Toggle
                  checked={form.featured}
                  onChange={toggleField("featured")}
                  label="Featured — Show on homepage"
                />
                <Toggle
                  checked={form.new_arrival}
                  onChange={toggleField("new_arrival")}
                  label="New Arrival — Mark as new"
                />
                <Toggle
                  checked={form.best_seller}
                  onChange={toggleField("best_seller")}
                  label="Best Seller — Highlight product"
                />
              </div>
            </div>

            {/* Right column - Image */}
            <div className="lg:col-span-5 space-y-4">
              {/* Image upload area */}
              <div>
                <label className="block font-label-sm text-secondary mb-1.5">
                  Product Image <span className="text-outline-variant">(optional)</span>
                </label>

                {/* File upload button */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-outline-variant/40 hover:border-primary/50 hover:bg-primary-container/5 transition-colors mb-3"
                >
                  {uploading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      <span className="font-label-sm text-secondary">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[20px] text-primary">cloud_upload</span>
                      <span className="font-label-sm text-secondary">Upload from computer</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-px bg-outline-variant/30" />
                  <span className="text-[11px] text-outline-variant uppercase">or</span>
                  <div className="flex-1 h-px bg-outline-variant/30" />
                </div>

                <input
                  type="text"
                  className="form-input w-full"
                  placeholder="Paste image URL"
                  value={form.image_url}
                  onChange={setField("image_url")}
                />
              </div>

              {/* Image preview */}
              <div className="rounded-xl overflow-hidden border border-outline-variant/20 bg-surface-container-low aspect-[4/5] flex items-center justify-center">
                {form.image_url && !imageError ? (
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="text-center p-6">
                    <span className="material-symbols-outlined text-[48px] text-outline-variant/50 block mb-2">
                      {imageError ? "broken_image" : "image"}
                    </span>
                    <p className="text-xs text-outline-variant">
                      {imageError ? "Image failed to load" : "No image selected"}
                    </p>
                  </div>
                )}
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-primary text-on-primary font-label-md uppercase tracking-wider hover:opacity-90 transition-opacity disabled:opacity-50 ripple flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                    {isEditing ? "Saving..." : "Adding..."}
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">
                      {isEditing ? "check" : "add"}
                    </span>
                    {isEditing ? "Save Changes" : "Add Product"}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ── Product list ── */}
      <div className="bg-surface rounded-2xl p-5 md:p-6 soft-glow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">inventory_2</span>
            Products
            <span className="px-2.5 py-0.5 rounded-full bg-primary-container/30 text-primary font-label-sm text-xs">
              {products.length}
            </span>
          </h2>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
                search
              </span>
              <input
                type="text"
                className="form-input pl-9 pr-3 py-2 text-sm w-full sm:w-52"
                placeholder="Search products..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
            <select
              className="form-input py-2 text-sm cursor-pointer"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>{cat} ({categoryCount(cat)})</option>
              ))}
            </select>
          </div>
        </div>

        {loading && products.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-body-md text-secondary">Loading products...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-3 block">
              {filter || categoryFilter !== "all" ? "search_off" : "inventory_2"}
            </span>
            <p className="font-body-md text-secondary mb-1">
              {filter || categoryFilter !== "all"
                ? "No products match your search"
                : "No products yet"}
            </p>
            <p className="text-xs text-outline-variant">
              {filter || categoryFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first product using the form above"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((product) => (
              <div
                key={product.id}
                className={`relative flex items-center gap-3 p-3 rounded-xl transition-all group ${
                  editingId === product.id
                    ? "bg-primary-container/20 ring-2 ring-primary/30"
                    : "bg-surface-container-low hover:bg-surface-container hover:shadow-sm"
                }`}
              >
                {/* Image */}
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/20">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt=""
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = "/placeholder-product.svg"; }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-secondary text-sm">image</span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-body-md text-on-surface text-sm truncate font-medium">{product.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-label-sm text-primary font-semibold">
                      {formatDZD(product.price)}
                    </span>
                    {product.category && (
                      <>
                        <span className="text-outline-variant text-xs">·</span>
                        <span className="font-label-sm text-secondary text-xs truncate">
                          {product.category}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {/* Stock badge */}
                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold ${
                      product.stock === 0
                        ? "bg-red-100 text-red-700"
                        : product.stock <= 5
                          ? "bg-amber-100 text-amber-700"
                          : "bg-green-100 text-green-700"
                    }`}>
                      {product.stock === 0 ? "Out of stock" : `${product.stock} in stock`}
                    </span>
                    {product.featured && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-primary-container/30 text-primary font-semibold">Featured</span>
                    )}
                    {product.new_arrival && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-blue-100 text-blue-700 font-semibold">New</span>
                    )}
                    {product.best_seller && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider bg-purple-100 text-purple-700 font-semibold">Best Seller</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2 rounded-lg text-secondary hover:bg-primary-container/30 hover:text-primary transition-colors"
                    title="Edit product"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(product)}
                    className="p-2 rounded-lg text-secondary hover:bg-error-container hover:text-on-error-container transition-colors"
                    title="Delete product"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductManager;
