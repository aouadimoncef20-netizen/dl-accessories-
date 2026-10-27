import { useEffect, useRef, useState } from "react";
import supabase from "../lib/supabase";
import { useToast } from "../Contexts/ToastContext";

/*
 * The gallery used to be six images compiled into the site. They live in
 * `gallery_images` now, so the shop can add a photo without a rebuild.
 * Uploads reuse the `product-images` bucket (created by
 * SUPABASE_MIGRATION.sql) under a `gallery/` prefix.
 */

const EMPTY = {
  title: "",
  description: "",
  category: "",
  image_url: "",
  sort_order: 0,
  active: true,
};

const CATEGORY_SUGGESTIONS = [
  "Jewellery",
  "Press-ons",
  "Watches",
  "Behind the scenes",
];

export default function GalleryManager() {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      setImages(data || []);
      setTableMissing(false);
    } catch (err) {
      const message = String(err?.message || err);
      if (/does not exist|schema cache|relation/i.test(message)) {
        setTableMissing(true);
      } else {
        toast.error(`Couldn't load the gallery: ${message}`);
      }
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setForm(EMPTY);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (!/^image\//.test(file.type)) {
      toast.error("Choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);

    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const path = `gallery/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(path, file, { upsert: true });

      if (!error) {
        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);
        if (data?.publicUrl) {
          setForm((f) => ({ ...f, image_url: data.publicUrl }));
          toast.success("Image uploaded");
          setUploading(false);
          return;
        }
      }

      // A real refusal — not signed in as the admin, a permissions policy,
      // the network — is the owner's problem to see, not something to hide
      // behind an embedded copy. Embedding a 4 MB photo in the row would
      // ship it on every Gallery page load.
      if (error) {
        toast.error(
          /bucket not found/i.test(error.message)
            ? "Storage not set up — run SUPABASE_MIGRATION.sql."
            : `Upload failed: ${error.message}`
        );
        setUploading(false);
        return;
      }
    } catch (err) {
      toast.error(`Upload failed: ${err?.message || err}`);
      setUploading(false);
      return;
    }

    // Storage answered but gave back no public URL — the row can hold the
    // picture itself. Only this narrow case embeds the file.
    const reader = new FileReader();
    reader.onload = (event) => {
      setForm((f) => ({ ...f, image_url: event.target.result }));
      toast.success("Image added (embedded)");
      setUploading(false);
    };
    reader.onerror = () => {
      toast.error("Could not read that image file");
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const save = async (e) => {
    e.preventDefault();

    if (!form.image_url) {
      toast.error("Add an image first");
      return;
    }

    setSaving(true);
    const payload = {
      title: form.title.trim() || null,
      description: form.description.trim() || null,
      category: form.category.trim() || null,
      image_url: form.image_url,
      sort_order: Number(form.sort_order) || 0,
      active: !!form.active,
    };

    try {
      if (editingId) {
        const { error } = await supabase
          .from("gallery_images")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
        setImages((prev) =>
          prev.map((img) => (img.id === editingId ? { ...img, ...payload } : img))
        );
        toast.success("Image updated");
      } else {
        const { data, error } = await supabase
          .from("gallery_images")
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        setImages((prev) =>
          [...prev, data].sort(
            (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
          )
        );
        toast.success("Image added to the gallery");
      }
      resetForm();
    } catch (err) {
      toast.error(`Couldn't save: ${String(err?.message || err)}`);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (image) => {
    setEditingId(image.id);
    setForm({
      title: image.title || "",
      description: image.description || "",
      category: image.category || "",
      image_url: image.image_url || "",
      sort_order: image.sort_order || 0,
      active: image.active !== false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleActive = async (image) => {
    const next = image.active === false;
    const { error } = await supabase
      .from("gallery_images")
      .update({ active: next })
      .eq("id", image.id);

    if (error) {
      toast.error(`Couldn't update: ${error.message}`);
      return;
    }
    setImages((prev) =>
      prev.map((img) => (img.id === image.id ? { ...img, active: next } : img))
    );
  };

  const remove = async (image) => {
    const { error } = await supabase
      .from("gallery_images")
      .delete()
      .eq("id", image.id);

    if (error) {
      toast.error(`Couldn't delete: ${error.message}`);
      return;
    }
    setImages((prev) => prev.filter((img) => img.id !== image.id));
    setDeleteConfirm(null);
    if (editingId === image.id) resetForm();
    toast.success("Image removed");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-1">
          Gallery
        </h1>
        <p className="font-body-md text-secondary">
          Photos shown on the public gallery page.
        </p>
      </div>

      {tableMissing && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 p-5 text-sm text-amber-900 dark:text-amber-200"
        >
          <p className="font-semibold mb-1">The gallery table isn't set up yet.</p>
          <p>
            Run <code className="font-mono">SUPABASE_UPGRADE.sql</code> in the
            Supabase SQL editor, then refresh this page.
          </p>
        </div>
      )}

      {/* ── Add / edit ── */}
      <form
        onSubmit={save}
        className="bg-surface rounded-2xl p-5 md:p-6 soft-glow space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-headline-sm text-headline-sm">
            {editingId ? "Edit image" : "Add an image"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-semibold text-secondary hover:text-on-surface"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 space-y-4">
            <label className="block">
              <span className="block font-label-sm text-secondary mb-1">
                Title
              </span>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="form-input w-full font-body-md"
                placeholder="e.g. Rose gold set"
              />
            </label>

            <label className="block">
              <span className="block font-label-sm text-secondary mb-1">
                Description
              </span>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                className="form-input w-full font-body-md resize-none"
                placeholder="A short line shown under the photo"
              />
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block font-label-sm text-secondary mb-1">
                  Category
                </span>
                <input
                  type="text"
                  list="gallery-categories"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="form-input w-full font-body-md"
                  placeholder="Jewellery"
                />
                <datalist id="gallery-categories">
                  {CATEGORY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </label>

              <label className="block">
                <span className="block font-label-sm text-secondary mb-1">
                  Order
                </span>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sort_order: e.target.value }))
                  }
                  className="form-input w-full font-body-md"
                  placeholder="0"
                />
                <span className="text-xs text-secondary">
                  Lower numbers appear first.
                </span>
              </label>
            </div>

            <label className="flex items-center gap-3 min-h-[44px]">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) =>
                  setForm((f) => ({ ...f, active: e.target.checked }))
                }
                className="w-5 h-5 rounded accent-[var(--color-primary,#8b5e3c)]"
              />
              <span className="font-body-md text-on-surface">
                Show on the public gallery
              </span>
            </label>
          </div>

          {/* Image */}
          <div>
            <span className="block font-label-sm text-secondary mb-1">
              Image
            </span>
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
              className="w-full aspect-[4/5] rounded-2xl border-2 border-dashed border-outline-variant/40 hover:border-primary/50 hover:bg-primary-container/5 transition-colors overflow-hidden flex items-center justify-center"
            >
              {form.image_url ? (
                <img
                  src={form.image_url}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = "/placeholder-product.svg";
                  }}
                />
              ) : uploading ? (
                <span className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-secondary">
                  <span className="material-symbols-outlined text-[28px] text-primary">
                    cloud_upload
                  </span>
                  <span className="font-label-sm">Upload image</span>
                </span>
              )}
            </button>
            {form.image_url && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, image_url: "" }))}
                className="mt-2 text-xs font-semibold text-error hover:underline"
              >
                Remove image
              </button>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving || uploading || !form.image_url}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-on-primary font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving && (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {editingId ? "Save changes" : "Add to gallery"}
        </button>
      </form>

      {/* ── Existing images ── */}
      <div className="bg-surface rounded-2xl p-5 md:p-6 soft-glow">
        <h2 className="font-headline-sm text-headline-sm mb-4">
          Gallery images ({images.length})
        </h2>

        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-body-md text-secondary">Loading…</p>
          </div>
        ) : images.length === 0 ? (
          <p className="py-10 text-center text-secondary font-body-md">
            No images yet. Add the first one above.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {images.map((image) => (
              <div
                key={image.id}
                className="rounded-2xl overflow-hidden border border-outline-variant/20 bg-surface-container-low"
              >
                <div className="relative aspect-[4/5]">
                  <img
                    src={image.image_url}
                    alt={image.title || "Gallery image"}
                    loading="lazy"
                    className={`w-full h-full object-cover ${image.active === false ? "opacity-40 grayscale" : ""}`}
                    onError={(e) => {
                      e.target.src = "/placeholder-product.svg";
                    }}
                  />
                  {image.active === false && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] uppercase tracking-wider">
                      Hidden
                    </span>
                  )}
                </div>
                <div className="p-3 space-y-2">
                  <p className="font-label-sm text-on-surface truncate">
                    {image.title || "Untitled"}
                  </p>
                  <p className="text-[11px] text-secondary truncate">
                    {image.category || "—"} · #{image.sort_order || 0}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(image)}
                      className="flex-1 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(image)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors"
                      title={image.active === false ? "Show" : "Hide"}
                      aria-label={image.active === false ? "Show image" : "Hide image"}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {image.active === false ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(image)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-error bg-error/5 hover:bg-error/10 transition-colors"
                      title="Delete"
                      aria-label="Delete image"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDeleteConfirm(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-gallery-title"
            className="bg-surface rounded-2xl p-6 max-w-sm w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="delete-gallery-title"
              className="font-headline-sm text-headline-sm mb-2"
            >
              Delete this image?
            </h3>
            <p className="text-secondary text-sm mb-6">
              “{deleteConfirm.title || "Untitled"}” will be removed from the
              gallery. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 rounded-xl border border-outline-variant/50 font-label-md text-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => remove(deleteConfirm)}
                className="flex-1 py-3 rounded-xl bg-error text-white font-label-md hover:opacity-90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
