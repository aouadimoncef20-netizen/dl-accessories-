import { useEffect, useState } from "react";
import supabase from "../lib/supabase";
import { useToast } from "../Contexts/ToastContext";
import { formatDZD } from "../lib/currency";
import { normalizeCouponCode } from "../lib/coupons";

/*
 * Promo codes. The checkout checks a code against this table to show the
 * discount, and place_order() checks it again before writing the order — so a
 * coupon that is switched off here stops working immediately, everywhere.
 */

const EMPTY = {
  code: "",
  kind: "percent",
  value: "",
  min_subtotal: "0",
  expires_at: "",
  active: true,
};

function toForm(row) {
  const percent = row.percent;
  return {
    code: row.code || "",
    kind: percent !== null && percent !== undefined ? "percent" : "amount",
    value: String(
      percent !== null && percent !== undefined ? percent : row.amount_dzd ?? ""
    ),
    min_subtotal: String(row.min_subtotal ?? 0),
    expires_at: row.expires_at ? String(row.expires_at).slice(0, 10) : "",
    active: row.active !== false,
  };
}

export default function CouponManager() {
  const toast = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingCode, setEditingCode] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons(data || []);
    } catch (err) {
      const message = String(err?.message || err);
      if (/does not exist|schema cache|relation/i.test(message)) {
        setTableMissing(true);
      } else {
        toast.error(`Couldn't load coupons: ${message}`);
      }
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = () => {
    setForm(EMPTY);
    setEditingCode(null);
  };

  const startEdit = (coupon) => {
    setEditingCode(coupon.code);
    setForm(toForm(coupon));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (e) => {
    e.preventDefault();

    const code = normalizeCouponCode(form.code);
    if (!code) {
      toast.error("Enter a code");
      return;
    }

    const value = Number(form.value);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a discount greater than zero");
      return;
    }
    if (form.kind === "percent" && value > 100) {
      toast.error("A percentage cannot be more than 100");
      return;
    }

    const payload = {
      code,
      percent: form.kind === "percent" ? value : null,
      amount_dzd: form.kind === "amount" ? value : null,
      min_subtotal: Math.max(0, Number(form.min_subtotal) || 0),
      expires_at: form.expires_at
        ? new Date(`${form.expires_at}T23:59:59`).toISOString()
        : null,
      active: !!form.active,
    };

    setSaving(true);
    try {
      if (editingCode) {
        const { error } = await supabase
          .from("coupons")
          .update(payload)
          .eq("code", editingCode);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) {
          if (error.code === "23505") {
            throw new Error("That code already exists.");
          }
          throw error;
        }
      }

      toast.success(editingCode ? "Coupon updated" : "Coupon created");
      reset();
      await load();
    } catch (err) {
      toast.error(`Couldn't save: ${String(err?.message || err)}`);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon) => {
    const next = coupon.active === false;
    const { error } = await supabase
      .from("coupons")
      .update({ active: next })
      .eq("code", coupon.code);

    if (error) {
      toast.error(`Couldn't update: ${error.message}`);
      return;
    }
    setCoupons((prev) =>
      prev.map((c) => (c.code === coupon.code ? { ...c, active: next } : c))
    );
  };

  const remove = async (coupon) => {
    if (
      !window.confirm(`Delete the code ${coupon.code}? Customers can no longer use it.`)
    ) {
      return;
    }
    const { error } = await supabase
      .from("coupons")
      .delete()
      .eq("code", coupon.code);

    if (error) {
      toast.error(`Couldn't delete: ${error.message}`);
      return;
    }
    setCoupons((prev) => prev.filter((c) => c.code !== coupon.code));
    if (editingCode === coupon.code) reset();
    toast.success("Coupon deleted");
  };

  const describe = (coupon) =>
    coupon.percent !== null && coupon.percent !== undefined
      ? `${Number(coupon.percent)}% off`
      : `${formatDZD(coupon.amount_dzd)} off`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-1">
          Promo codes
        </h1>
        <p className="font-body-md text-secondary">
          Discounts the customer can type at checkout.
        </p>
      </div>

      {tableMissing && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 p-5 text-sm text-amber-900 dark:text-amber-200"
        >
          <p className="font-semibold mb-1">Coupons aren't set up yet.</p>
          <p>
            Run <code className="font-mono">SUPABASE_UPGRADE.sql</code> in the
            Supabase SQL editor, then refresh this page.
          </p>
        </div>
      )}

      <form
        onSubmit={save}
        className="bg-surface rounded-2xl p-5 md:p-6 soft-glow space-y-4"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-headline-sm text-headline-sm">
            {editingCode ? `Edit ${editingCode}` : "New code"}
          </h2>
          {editingCode && (
            <button
              type="button"
              onClick={reset}
              className="text-sm font-semibold text-secondary hover:text-on-surface"
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <label className="block">
            <span className="block font-label-sm text-secondary mb-1">Code</span>
            <input
              type="text"
              required
              autoCapitalize="characters"
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))
              }
              disabled={!!editingCode}
              className="form-input w-full font-body-md uppercase disabled:opacity-60"
              placeholder="RAMADAN10"
            />
          </label>

          <label className="block">
            <span className="block font-label-sm text-secondary mb-1">Type</span>
            <select
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              className="form-input w-full font-body-md"
            >
              <option value="percent">Percentage</option>
              <option value="amount">Fixed amount</option>
            </select>
          </label>

          <label className="block">
            <span className="block font-label-sm text-secondary mb-1">
              {form.kind === "percent" ? "Percent off" : "Amount off (DZD)"}
            </span>
            <input
              type="number"
              required
              min="0"
              step={form.kind === "percent" ? "1" : "50"}
              max={form.kind === "percent" ? "100" : undefined}
              value={form.value}
              onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
              className="form-input w-full font-body-md"
              placeholder={form.kind === "percent" ? "10" : "500"}
            />
          </label>

          <label className="block">
            <span className="block font-label-sm text-secondary mb-1">
              Minimum order (DZD)
            </span>
            <input
              type="number"
              min="0"
              step="100"
              value={form.min_subtotal}
              onChange={(e) =>
                setForm((f) => ({ ...f, min_subtotal: e.target.value }))
              }
              className="form-input w-full font-body-md"
            />
          </label>

          <label className="block">
            <span className="block font-label-sm text-secondary mb-1">
              Expires
            </span>
            <input
              type="date"
              value={form.expires_at}
              onChange={(e) =>
                setForm((f) => ({ ...f, expires_at: e.target.value }))
              }
              className="form-input w-full font-body-md"
            />
            <span className="text-xs text-secondary">Leave empty for no end date.</span>
          </label>

          <label className="flex items-center gap-3 sm:mt-6 min-h-[44px]">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) =>
                setForm((f) => ({ ...f, active: e.target.checked }))
              }
              className="w-5 h-5 rounded accent-[var(--color-primary,#8b5e3c)]"
            />
            <span className="font-body-md text-on-surface">Active</span>
          </label>
        </div>

        <button
          type="submit"
          disabled={saving || tableMissing}
          className="w-full sm:w-auto px-8 py-3 rounded-xl bg-primary text-on-primary font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {saving && (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {editingCode ? "Save changes" : "Create coupon"}
        </button>
      </form>

      <div className="bg-surface rounded-2xl p-5 md:p-6 soft-glow">
        <h2 className="font-headline-sm text-headline-sm mb-4">
          Codes ({coupons.length})
        </h2>

        {loading ? (
          <p className="py-10 text-center text-secondary">Loading…</p>
        ) : coupons.length === 0 ? (
          <p className="py-10 text-center text-secondary font-body-md">
            No promo codes yet.
          </p>
        ) : (
          <div className="space-y-2">
            {coupons.map((coupon) => {
              const expired =
                coupon.expires_at && new Date(coupon.expires_at) < new Date();
              return (
                <div
                  key={coupon.code}
                  className="flex flex-wrap items-center gap-3 rounded-xl bg-surface-container-low p-3"
                >
                  <span className="font-mono font-bold text-on-surface tracking-wide">
                    {coupon.code}
                  </span>
                  <span className="text-sm text-primary">
                    {describe(coupon)}
                  </span>
                  {Number(coupon.min_subtotal) > 0 && (
                    <span className="text-xs text-secondary">
                      min {formatDZD(coupon.min_subtotal)}
                    </span>
                  )}
                  {coupon.expires_at && (
                    <span className={`text-xs ${expired ? "text-error" : "text-secondary"}`}>
                      {expired ? "expired" : "until"}{" "}
                      {new Date(coupon.expires_at).toLocaleDateString()}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold ${
                      coupon.active === false || expired
                        ? "bg-surface-container text-secondary"
                        : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                    }`}
                  >
                    {coupon.active === false ? "Off" : expired ? "Expired" : "Active"}
                  </span>

                  <div className="ms-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(coupon)}
                      className="px-3 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(coupon)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors"
                      aria-label={coupon.active === false ? "Activate code" : "Deactivate code"}
                      title={coupon.active === false ? "Activate" : "Deactivate"}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {coupon.active === false ? "toggle_off" : "toggle_on"}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(coupon)}
                      className="w-9 h-9 flex items-center justify-center rounded-lg text-error bg-error/5 hover:bg-error/10 transition-colors"
                      aria-label="Delete coupon"
                      title="Delete"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        delete
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
