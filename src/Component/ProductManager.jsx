import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import useProductStore from "../stores/productStore";
import supabase from "../lib/supabase";
import { useToast } from "../Contexts/ToastContext";
import { formatDZD } from "../lib/currency";
import { colorsToField, sizesToField, LOW_STOCK } from "../lib/productOptions";
import Pagination from "./Pagination";
import {
  buildVariantGrid,
  parseColors,
  serializeColors,
  parseSizes,
  variantKey,
} from "../lib/productOptions";

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

const EMPTY_FORM = {  name: "",
  price: "",
  sale_price: "",
  category: CATEGORY_OPTIONS[0],
  image_url: "",
  description: "",
  stock: "0",
  colors: "",
  sizes: "",
  is_pack: false,
  best_seller: false,
  featured: false,
  new_arrival: false,
};

// One place decides how a stock figure reads, so the badge's colour and its
// wording can never disagree.
function stockTone(stock) {
  if (typeof stock !== "number") return "bg-surface-container text-secondary";
  if (stock === 0) return "bg-red-100 text-red-700";
  if (stock <= LOW_STOCK) return "bg-amber-100 text-amber-700";
  return "bg-green-100 text-green-700";
}

function stockLabel(stock) {
  if (typeof stock !== "number") return "No stock figure";
  if (stock === 0) return "Out of stock";
  return `${stock} in stock`;
}

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
    catalogueLoaded,
    fetchAllProducts,
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
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  // Which stock level to show. "Low" and "out" are the two lists the shop
  // actually needs to act on before a customer hits a sold-out page.
  const [stockFilter, setStockFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [imageError, setImageError] = useState(false);
  // How many of each colour × size pair are on the shelf, keyed "red|15".
  // Kept out of `form` because it is rebuilt whenever the colour or size list
  // changes, and a stale key must never reappear as a stock figure.
  const [variantStock, setVariantStock] = useState({});

  useEffect(() => {
    // The dashboard usually has the catalogue already. This only pays for the
    // read once, instead of re-downloading every product on each visit to
    // this tab.
    if (!catalogueLoaded) fetchAllProducts();
    fetchCategories();
  }, [catalogueLoaded, fetchAllProducts, fetchCategories]);

  const allCategories = useMemo(
    () =>
      [
        ...new Set([
          ...CATEGORY_OPTIONS,
          ...(categories || []).map((c) => c.name),
        ]),
      ].sort(),
    [categories]
  );

  // A search keystroke re-runs this over the whole catalogue. That is cheap
  // for a few hundred rows — but only if it isn't recomputed on every
  // unrelated render (a toggle switch, an open dialog, the form re-typing).
  const searchTerm = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.name?.toLowerCase().includes(searchTerm) ||
        p.category?.toLowerCase().includes(searchTerm);
      const matchesCategory =
        categoryFilter === "all" ||
        String(p.category || "").trim().toLowerCase() === categoryFilter.toLowerCase();

      // `null` stock means the product has no figure at all — it is not
      // "out", it is "unknown", so it only shows under "all".
      const hasFigure = typeof p.stock === "number";
      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "out" && p.stock === 0) ||
        (stockFilter === "low" && hasFigure && p.stock > 0 && p.stock <= LOW_STOCK) ||
        (stockFilter === "in" && hasFigure && p.stock > LOW_STOCK);

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, categoryFilter, stockFilter]);

  const stockCounts = useMemo(() => {
    let low = 0;
    let out = 0;
    for (const p of products) {
      if (typeof p.stock !== "number") continue;
      if (p.stock === 0) out += 1;
      else if (p.stock <= LOW_STOCK) low += 1;
    }
    return { low, out };
  }, [products]);

  const lowStock = stockCounts.low;
  const outOfStock = stockCounts.out;

  // The list is paged, not virtual: drawing 200 cards at once (and asking the
  // browser for 200 images in the same tick) is what made this tab crawl. 24
  // keeps a full row count on a wide screen without a wall of thumbnails.
  const PAGE_SIZE = 24;
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE;
  const visibleProducts = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  // A new search or filter starts the list again at page one.
  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter, stockFilter]);

  const isEditing = editingId !== null;

  /**
   * The combinations this product is sold in, worked out from what the owner
   * has typed in the two option boxes. An empty colour list or an empty size
   * list still produces a usable one-dimensional grid — a bracelet that only
   * comes in three sizes, or a ring that only comes in two colours.
   */
  const { colorList, sizeList, combos } = buildVariantGrid(
    parseColors(serializeColors(form.colors)),
    parseSizes(form.sizes)
  );
  const hasVariants = combos.length > 0;

  const variantRows = combos.map((c) => {
    const key = variantKey(c.color, c.size);
    return { ...c, key, value: variantStock[key] ?? "" };
  });

  const variantTotal = variantRows.reduce(
    (sum, r) => sum + (r.value === "" ? 0 : Math.max(0, Number(r.value) || 0)),
    0
  );

  const setVariantValue = (key, value) => {
    setVariantStock((prev) => ({ ...prev, [key]: value.replace(/[^\d]/g, "") }));
  };

  // ── Image upload handler ──
  const handleImageUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    // Reset the input so picking the same file again still fires onChange
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);

    // 1st choice: upload to Supabase Storage and use the returned public URL
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const fileName = `products/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(fileName, file, { upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        if (urlData?.publicUrl) {
          setForm((prev) => ({ ...prev, image_url: urlData.publicUrl }));
          setImageError(false);
          toast.success("Image uploaded");
          setUploading(false);
          return;
        }
      }

      // The bucket is missing → tell the admin exactly what to run
      if (uploadError && /bucket not found/i.test(uploadError.message)) {
        toast.error("Storage not set up — run SUPABASE_MIGRATION.sql in Supabase.");
      }
    } catch {
      /* fall through to the embedded-image fallback below */
    }

    // 2nd choice: embed small images directly so the admin isn't blocked
    if (file.size > 1024 * 1024) {
      toast.error("Upload failed — image too large to embed. Paste an image URL instead.");
      setUploading(false);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setForm((prev) => ({ ...prev, image_url: event.target.result }));
      setImageError(false);
      toast.success("Image added (embedded — run the migration for proper uploads)");
      setUploading(false);
    };
    reader.onerror = () => {
      toast.error("Could not read that image file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setVariantStock({});
    setImageError(false);
  }, []);

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

      // The stock figure the row carries is the total of the grid when the
      // owner counts by colour and size — one number, always the sum.
      const payload = {
        ...form,
        stock: hasVariants ? variantTotal : form.stock,
        // One row per combination the owner actually filled in. An empty box
        // means "we don't sell that pair", which is different from "none
        // left", so it is left out rather than written as a zero. An empty
        // grid is still written: if the colours were deleted, the product
        // stops being counted per colour.
        variants: variantRows
          .filter((r) => r.value !== "")
          .map((r) => ({
            color: r.color,
            size: r.size,
            stock: Math.max(0, Number(r.value) || 0),
          })),
        sale_price: form.sale_price,
        is_pack: form.is_pack,
      };

      if (isEditing) {
        const { data, error } = await updateProduct(editingId, payload);
        if (error) {
          const msg = error.includes("row-level security")
            ? "The database refused this change: only your Supabase admin account can save products. Sign out and back in with zaki1@dlaccessories.com — the offline admin password can look but not save."
            : error;
          toast.error(msg);
        } else {
          toast.success(`"${data.name}" updated`);
          cancelEdit();
        }
      } else {
        const { data, error } = await createProduct(payload);
        if (error) {
          const msg = error.includes("row-level security")
            ? "The database refused this product: only your Supabase admin account can add one. Sign out and back in with zaki1@dlaccessories.com — the offline admin password can look but not save."
            : error;
          toast.error(msg);
        } else {
          toast.success(`"${data.name}" added`);
          setForm(EMPTY_FORM);
          setVariantStock({});
          setImageError(false);
          // A new product sits at the top of the newest-first list, so show
          // the page it landed on instead of leaving the admin on page 4.
          setPage(1);
          fetchCategories();
        }
      }

      setSubmitting(false);
    },
    [form, isEditing, editingId, createProduct, updateProduct, fetchCategories, toast, cancelEdit, hasVariants, variantTotal, variantRows]
  );

  const handleEdit = useCallback((product) => {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      price: product.price?.toString() || "",
      sale_price: product.sale_price ? String(product.sale_price) : "",
      category: product.category || CATEGORY_OPTIONS[0],
      image_url: product.image || "",
      description: product.description || "",
      stock: typeof product.stock === "number" ? String(product.stock) : "",
      colors: colorsToField(product.colors),
      sizes: sizesToField(product.sizes),
      is_pack: product.is_pack || false,
      best_seller: product.best_seller || false,
      featured: product.featured || false,
      new_arrival: product.new_arrival || false,
    });

    // Re-open the grid exactly as it was saved.
    const stock = {};
    for (const v of product.variants || []) {
      stock[variantKey(v.color, v.size)] =
        typeof v.stock === "number" ? String(v.stock) : "";
    }
    setVariantStock(stock);

    setImageError(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  // One pass over the catalogue instead of one pass per category, so the
  // dropdown's counts cost nothing to render.
  const categoryCounts = useMemo(() => {
    const counts = new Map();
    for (const p of products) {
      const key = p.category || "";
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [products]);

  const categoryCount = (cat) =>
    cat === "all" ? products.length : categoryCounts.get(cat) || 0;

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
      {(lowStock > 0 || outOfStock > 0) && (
        <div className="flex flex-wrap gap-3">
          {outOfStock > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50">
              <span className="material-symbols-outlined text-[18px] text-red-600">error</span>
              <span className="font-label-sm text-red-700 dark:text-red-400">{outOfStock} out of stock</span>
            </div>
          )}
          {lowStock > 0 && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50">
              <span className="material-symbols-outlined text-[18px] text-amber-600">warning</span>
              <span className="font-label-sm text-amber-700 dark:text-amber-400">{lowStock} low stock</span>
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

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  {/* Dinars, not dollars. The number typed here is the number
                      on the shop front — nothing converts it on the way, so
                      there is no "≈" line to second-guess it. Dinars have no
                      cents in practice, so the field steps by whole units. */}
                  <label className="block font-label-sm text-secondary mb-1.5">Price (DZD) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-label-md">DA</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="form-input w-full pl-10"
                      placeholder="0"
                      value={form.price}
                      onChange={setField("price")}
                    />
                  </div>
                </div>
                <div>
                  {/* A promo is a second price, not a discount to work out:
                      leave it empty and nothing shows on the card. */}
                  <label className="block font-label-sm text-secondary mb-1.5">
                    Promo price
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary font-label-md">DA</span>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="form-input w-full pl-10"
                      placeholder="—"
                      value={form.sale_price}
                      onChange={setField("sale_price")}
                    />
                  </div>
                  {form.sale_price !== "" &&
                    Number(form.sale_price) > 0 &&
                    Number(form.sale_price) >= Number(form.price) && (
                      <p className="text-[11px] text-amber-600 mt-1">
                        Must be below the price to count as a promo
                      </p>
                    )}
                </div>
                <div>
                  <label className="block font-label-sm text-secondary mb-1.5">
                    Stock *
                    {hasVariants && (
                      <span className="text-outline-variant font-normal"> (auto)</span>
                    )}
                  </label>
                  {hasVariants ? (
                    <>
                      <input
                        type="number"
                        readOnly
                        className="form-input w-full bg-surface-container-low text-on-surface"
                        value={variantTotal}
                        aria-describedby="stock-auto-hint"
                      />
                      <p id="stock-auto-hint" className="text-[11px] text-outline-variant mt-1">
                        Sum of the grid below
                      </p>
                    </>
                  ) : (
                    <>
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
                      {Number(form.stock) > 0 && Number(form.stock) <= LOW_STOCK && (
                        <p className="text-[11px] text-amber-500 mt-1">Low stock</p>
                      )}
                    </>
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

              {/* Options — what the product page offers the customer, and
                  what ends up on the order line the admin packs from. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-label-sm text-secondary mb-1.5">
                    Colours <span className="text-outline-variant">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input w-full"
                    placeholder="Rose Gold:#B76E79, Black:#1C1B1B"
                    value={form.colors}
                    onChange={setField("colors")}
                  />
                  <p className="text-[11px] text-outline-variant mt-1">
                    Name:hex, separated by commas. Empty hides the swatches.
                  </p>
                </div>
                <div>
                  <label className="block font-label-sm text-secondary mb-1.5">
                    Sizes <span className="text-outline-variant">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="form-input w-full"
                    placeholder="4, 5, 6, 7, 8"
                    value={form.sizes}
                    onChange={setField("sizes")}
                  />
                  <p className="text-[11px] text-outline-variant mt-1">
                    Separated by commas. Empty for one-size products.
                  </p>
                </div>
              </div>

              {/* Stock per colour and per size.
                  A bracelet in red and green, sizes 14–16, is not "nine in
                  stock" — it is nine red-15s, one red-14 and none in red-16.
                  One box per combination is the only honest way to record
                  that, and the total above is always their sum. */}
              {hasVariants && (
                <div className="rounded-xl border border-outline-variant/30 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-label-md text-on-surface">
                        Stock by colour and size
                      </p>
                      <p className="text-[11px] text-secondary">
                        Leave a box empty if you don't sell that combination.
                      </p>
                    </div>
                    <span className="text-sm font-label-md text-primary">
                      {variantTotal} total
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-separate border-spacing-1">
                      <thead>
                        <tr>
                          <th className="text-start font-label-sm text-secondary px-1">
                            {sizeList.length ? "Colour \\ Size" : "Colour"}
                          </th>
                          {sizeList.map((s) => (
                            <th key={s} className="font-label-sm text-secondary text-center px-1">
                              {s}
                            </th>
                          ))}
                          {!sizeList.length && (
                            <th className="font-label-sm text-secondary text-center px-1">
                              Stock
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {(colorList.length ? colorList : [""]).map((color) => (
                          <tr key={color || "only"}>
                            <td className="px-1 text-on-surface whitespace-nowrap">
                              {color || "Sizes only"}
                            </td>
                            {(sizeList.length ? sizeList : [""]).map((size) => {
                              const key = variantKey(color, size);
                              const row = variantRows.find((r) => r.key === key);
                              return (
                                <td key={key} className="px-0.5">
                                  <input
                                    type="number"
                                    min="0"
                                    inputMode="numeric"
                                    value={row?.value ?? ""}
                                    onChange={(e) => setVariantValue(key, e.target.value)}
                                    aria-label={`Stock for ${color || "this product"} ${size || ""}`.trim()}
                                    placeholder="—"
                                    className="form-input w-16 py-1.5 text-center"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

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
                <Toggle
                  checked={form.is_pack}
                  onChange={toggleField("is_pack")}
                  label="Pack — Sold as a set, shown under Packs"
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
                      <span className="font-label-sm text-secondary">Upload image</span>
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
      <div className="bg-surface rounded-2xl p-4 sm:p-5 md:p-6 soft-glow">
        <div className="flex flex-col gap-4 mb-5 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="font-headline-sm text-headline-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">inventory_2</span>
            Products
            <span className="px-2.5 py-0.5 rounded-full bg-primary-container/30 text-primary font-label-sm text-xs">
              {filtered.length === products.length
                ? products.length
                : `${filtered.length} / ${products.length}`}
            </span>
          </h2>

          {/* Three controls side by side need ~500px. Below that they stack,
              full width, instead of pushing the panel into a sideways scroll. */}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
            <div className="relative sm:col-span-2 lg:col-auto">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
                search
              </span>
              <input
                type="text"
                className="form-input pl-9 pr-3 py-2.5 text-sm w-full lg:w-60"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search products"
              />
            </div>
            <select
              className="form-input py-2.5 text-sm w-full cursor-pointer lg:w-auto"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Filter by category"
            >
              <option value="all">All Categories</option>
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>{cat} ({categoryCount(cat)})</option>
              ))}
            </select>
            <select
              className="form-input py-2.5 text-sm w-full cursor-pointer lg:w-auto"
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              aria-label="Filter by stock"
            >
              <option value="all">Any stock</option>
              <option value="low">Low stock ({lowStock})</option>
              <option value="out">Out of stock ({outOfStock})</option>
              <option value="in">In stock</option>
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
              {search || categoryFilter !== "all" || stockFilter !== "all"
                ? "search_off"
                : "inventory_2"}
            </span>
            <p className="font-body-md text-secondary mb-1">
              {search || categoryFilter !== "all" || stockFilter !== "all"
                ? "No products match your search"
                : "No products yet"}
            </p>
            <p className="text-xs text-outline-variant">
              {search || categoryFilter !== "all" || stockFilter !== "all"
                ? "Try adjusting your filters"
                : "Add your first product using the form above"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visibleProducts.map((product) => (
              <div
                key={product.id}
                className={`relative flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl transition-all ${
                  editingId === product.id
                    ? "bg-primary-container/20 ring-2 ring-primary/30"
                    : "bg-surface-container-low hover:bg-surface-container hover:shadow-sm"
                }`}
              >
                {/* Image — lazy, so a page of 24 never asks for images that
                    are scrolled past (or on another page) in the same tick. */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden bg-surface-container flex-shrink-0 border border-outline-variant/20">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
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
                  <p className="font-body-md text-on-surface text-sm sm:text-[15px] truncate font-medium">{product.name}</p>
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
                    <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold ${stockTone(product.stock)}`}>
                      {stockLabel(product.stock)}
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

                {/* Actions. Always visible: a phone has no hover, and an Edit
                    button that only appears under a mouse is a button the shop
                    owner cannot press at all. */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(product)}
                    className="p-2.5 rounded-lg text-secondary hover:bg-primary-container/30 hover:text-primary transition-colors"
                    title="Edit product"
                    aria-label={`Edit ${product.name}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">edit</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(product)}
                    className="p-2.5 rounded-lg text-secondary hover:bg-error-container hover:text-on-error-container transition-colors"
                    title="Delete product"
                    aria-label={`Delete ${product.name}`}
                  >
                    <span className="material-symbols-outlined text-[20px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Which slice of the catalogue is on screen, and a way through the
            rest of it. Without this the tab had to draw every product at once. */}
        {!loading && filtered.length > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-outline-variant/20 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-label-sm text-secondary">
              Showing{" "}
              <span className="font-semibold text-on-surface">
                {pageStart + 1}–{pageStart + visibleProducts.length}
              </span>{" "}
              of <span className="font-semibold text-on-surface">{filtered.length}</span>
              {filtered.length !== products.length && ` (filtered from ${products.length})`}
            </p>
            <Pagination
              page={currentPage}
              pageCount={pageCount}
              onChange={setPage}
              label="Product pages"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductManager;
