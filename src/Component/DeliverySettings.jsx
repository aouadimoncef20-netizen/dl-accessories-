import { useEffect, useMemo, useState } from "react";
import supabase from "../lib/supabase";
import useSettingsStore from "../stores/settingsStore";
import { useToast } from "../Contexts/ToastContext";
import { WILAYAS } from "../lib/wilayas";
import { formatDZD } from "../lib/currency";
import {
  STOP_DESK_EXTRA_DZD,
  STOP_DESK_EXTRA_LOCAL_DZD,
  STOP_DESK_LOCAL_WILAYAS,
  stopDeskExtraFor,
} from "../lib/shipping";

/*
 * Delivery prices and the two shop settings the checkout reads.
 *
 * `delivery_zones` is the same table place_order() prices an order from, so
 * what is typed here is what the customer is charged and what the database
 * enforces — there is no second copy in the code to drift.
 *
 * Two prices per wilaya: to the door, and collected from the courier's desk.
 */

const SETTING_KEYS = {
  outskirts: "reghaia_outskirts_dzd",
  freeOver: "free_delivery_over_dzd",
};

const EMPTY = { home: "", desk: "" };

export default function DeliverySettings() {
  const toast = useToast();
  const refreshConfig = useSettingsStore((s) => s.fetchConfig);

  const [prices, setPrices] = useState({});
  const [original, setOriginal] = useState({});
  const [settings, setSettings] = useState({ outskirts: "200", freeOver: "0" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);
  const [deskColumnMissing, setDeskColumnMissing] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        // `stopdesk_dzd` arrives with SUPABASE_UPGRADE.sql. Asking for a
        // column that isn't there fails the whole query, so the second read
        // is the one without it.
        let zonesRes = await supabase
          .from("delivery_zones")
          .select("wilaya_code, price_dzd, stopdesk_dzd")
          .order("wilaya_code");

        if (zonesRes.error) {
          setDeskColumnMissing(true);
          zonesRes = await supabase
            .from("delivery_zones")
            .select("wilaya_code, price_dzd")
            .order("wilaya_code");
        }

        const settingsRes = await supabase
          .from("store_settings")
          .select("key, value")
          .in("key", [SETTING_KEYS.outskirts, SETTING_KEYS.freeOver]);

        if (!alive) return;

        if (zonesRes.error) throw zonesRes.error;

        const map = {};
        for (const row of zonesRes.data || []) {
          const home = String(Number(row.price_dzd) || 0);
          const desk =
            row.stopdesk_dzd === null || row.stopdesk_dzd === undefined
              ? String(Number(home) + stopDeskExtraFor(row.wilaya_code))
              : String(Number(row.stopdesk_dzd) || 0);
          map[row.wilaya_code] = { home, desk };
        }
        // A wilaya with no row still needs inputs, so seed every code with an
        // empty value rather than silently hiding it.
        for (const w of WILAYAS) if (!(w.code in map)) map[w.code] = { ...EMPTY };

        setPrices(map);
        setOriginal(map);

        if (!settingsRes.error) {
          const valueOf = (key) =>
            settingsRes.data?.find((r) => r.key === key)?.value;
          setSettings({
            outskirts: valueOf(SETTING_KEYS.outskirts) ?? "200",
            freeOver: valueOf(SETTING_KEYS.freeOver) ?? "0",
          });
        }
      } catch (err) {
        if (!alive) return;
        const message = String(err?.message || err);
        if (/does not exist|schema cache|relation/i.test(message)) {
          setTableMissing(true);
        } else {
          toast.error(`Couldn't load delivery prices: ${message}`);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirtyCodes = useMemo(
    () =>
      WILAYAS.map((w) => w.code).filter((code) => {
        const now = prices[code] ?? EMPTY;
        const was = original[code] ?? EMPTY;
        return (now.home ?? "") !== (was.home ?? "") || (now.desk ?? "") !== (was.desk ?? "");
      }),
    [prices, original]
  );

  const visible = WILAYAS.filter(
    (w) =>
      !search.trim() ||
      w.name.toLowerCase().includes(search.trim().toLowerCase()) ||
      w.code.includes(search.trim())
  );

  const setPrice = (code, field, value) => {
    const clean = value.replace(/[^\d.]/g, "");
    setPrices((prev) => ({
      ...prev,
      [code]: { ...(prev[code] ?? EMPTY), [field]: clean },
    }));
  };

  /**
   * Rebuild every stop-desk price from the door price using the shop's rule.
   * Saves typing 58 numbers, and keeps the rule and the buttons in step.
   */
  const applyDeskRule = () => {
    setPrices((prev) => {
      const next = { ...prev };
      for (const w of WILAYAS) {
        const row = next[w.code] ?? EMPTY;
        if (row.home === "") continue;
        next[w.code] = {
          ...row,
          desk: String(Number(row.home) + stopDeskExtraFor(w.code)),
        };
      }
      return next;
    });
    toast.info(
      `Stop desk = door + ${STOP_DESK_EXTRA_DZD} DZD (+${STOP_DESK_EXTRA_LOCAL_DZD} for ${STOP_DESK_LOCAL_WILAYAS.join(", ")})`
    );
  };

  const savePrices = async () => {
    if (dirtyCodes.length === 0) return;

    // An empty box is not a price. Refuse rather than silently writing 0 —
    // a free delivery to every wilaya would be an expensive typo.
    const blank = dirtyCodes.filter(
      (code) => (prices[code]?.home ?? "") === "" || (prices[code]?.desk ?? "") === ""
    );
    if (blank.length) {
      toast.error(
        `Fill in both prices for ${blank
          .slice(0, 3)
          .map((code) => WILAYAS.find((w) => w.code === code)?.name || code)
          .join(", ")}${blank.length > 3 ? "…" : ""}`
      );
      return;
    }

    setSaving(true);
    try {
      const rows = dirtyCodes.map((code) => ({
        wilaya_code: code,
        price_dzd: Math.max(0, Number(prices[code].home) || 0),
        ...(deskColumnMissing
          ? {}
          : { stopdesk_dzd: Math.max(0, Number(prices[code].desk) || 0) }),
        updated_at: new Date().toISOString(),
      }));

      let { error } = await supabase
        .from("delivery_zones")
        .upsert(rows, { onConflict: "wilaya_code" });

      // Older project without the stop-desk column — still save the door
      // prices rather than losing the whole edit.
      if (error && /stopdesk_dzd|schema cache|column/i.test(String(error.message))) {
        setDeskColumnMissing(true);
        const fallback = await supabase.from("delivery_zones").upsert(
          rows.map(({ stopdesk_dzd: _d, ...row }) => row),
          { onConflict: "wilaya_code" }
        );
        error = fallback.error;
        if (!error) {
          toast.info("Door prices saved — run SUPABASE_UPGRADE.sql to store stop-desk prices.");
        }
      }

      if (error) throw error;

      setOriginal((prev) => {
        const next = { ...prev };
        for (const code of dirtyCodes) next[code] = { ...prices[code] };
        return next;
      });
      await refreshConfig();
      toast.success(`${rows.length} wilaya${rows.length === 1 ? "" : "s"} saved`);
    } catch (err) {
      toast.error(`Couldn't save: ${String(err?.message || err)}`);
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const rows = [
        { key: SETTING_KEYS.outskirts, value: String(Number(settings.outskirts) || 0) },
        { key: SETTING_KEYS.freeOver, value: String(Number(settings.freeOver) || 0) },
      ];

      const { error } = await supabase
        .from("store_settings")
        .upsert(rows, { onConflict: "key" });

      if (error) throw error;
      await refreshConfig();
      toast.success("Shop settings saved");
    } catch (err) {
      toast.error(`Couldn't save: ${String(err?.message || err)}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="font-body-md text-secondary">Loading delivery prices…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-1">
          Delivery
        </h1>
        <p className="font-body-md text-secondary">
          What the customer pays for each wilaya — to the door, or collected
          from the courier's desk.
        </p>
      </div>

      {tableMissing && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 p-5 text-sm text-amber-900 dark:text-amber-200"
        >
          <p className="font-semibold mb-1">Delivery prices aren't in the database yet.</p>
          <p>
            Run <code className="font-mono">SUPABASE_UPGRADE.sql</code> in the
            Supabase SQL editor. Until then the shop uses the built-in prices.
          </p>
        </div>
      )}

      {deskColumnMissing && !tableMissing && (
        <div
          role="alert"
          className="rounded-2xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 p-5 text-sm text-amber-900 dark:text-amber-200"
        >
          <p className="font-semibold mb-1">Stop-desk prices aren't stored yet.</p>
          <p>
            Run <code className="font-mono">SUPABASE_UPGRADE.sql</code> to add
            the column. Meanwhile the shop adds the surcharge on top of the door
            price automatically, so customers are still charged correctly.
          </p>
        </div>
      )}

      {/* ── Local rules ── */}
      <div className="bg-surface rounded-2xl p-5 md:p-6 soft-glow">
        <h2 className="font-headline-sm text-headline-sm mb-1">Shop delivery</h2>
        <p className="text-sm text-secondary mb-5">
          Campus delivery is always free. Réghaïa town is free too — these two
          numbers are the exceptions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <label className="block">
            <span className="block font-label-sm text-secondary mb-1">
              Réghaïa outskirts ({formatDZD(settings.outskirts)})
            </span>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="50"
                value={settings.outskirts}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, outskirts: e.target.value }))
                }
                className="form-input w-full font-body-md pe-14"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-secondary">
                DZD
              </span>
            </div>
            <span className="text-xs text-secondary">
              Charged only for a périphérie address.
            </span>
          </label>

          <label className="block">
            <span className="block font-label-sm text-secondary mb-1">
              Free delivery over
            </span>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="500"
                value={settings.freeOver}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, freeOver: e.target.value }))
                }
                className="form-input w-full font-body-md pe-14"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-secondary">
                DZD
              </span>
            </div>
            <span className="text-xs text-secondary">
              0 means never free.
            </span>
          </label>
        </div>

        <button
          type="button"
          onClick={saveSettings}
          disabled={saving || tableMissing}
          className="mt-5 px-6 py-3 rounded-xl bg-primary text-on-primary font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save shop settings
        </button>
      </div>

      {/* ── Wilaya prices ── */}
      <div className="bg-surface rounded-2xl p-5 md:p-6 soft-glow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="font-headline-sm text-headline-sm mb-1">
              Price per wilaya
            </h2>
            <p className="text-sm text-secondary">
              The courier's own price card is the source of truth — copy it here.
            </p>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
              search
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input pl-10 py-2.5 text-sm w-full sm:w-56"
              placeholder="Search a wilaya"
              aria-label="Search wilayas"
            />
          </div>
        </div>

        <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-surface-container-low px-4 py-3">
          <p className="text-sm text-secondary flex-1">
            Stop desk = door price + {STOP_DESK_EXTRA_DZD} DZD, and +
            {STOP_DESK_EXTRA_LOCAL_DZD} DZD for{" "}
            {STOP_DESK_LOCAL_WILAYAS.map(
              (code) => WILAYAS.find((w) => w.code === code)?.name || code
            ).join(", ")}
            .
          </p>
          <button
            type="button"
            onClick={applyDeskRule}
            className="px-4 py-2 rounded-xl border border-outline-variant/40 text-sm font-semibold text-on-surface hover:bg-surface-container transition-colors"
          >
            Recalculate stop desk
          </button>
        </div>

        {dirtyCodes.length > 0 && (
          <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 px-4 py-3">
            <p className="text-sm text-amber-900 dark:text-amber-200 flex-1">
              {dirtyCodes.length} unsaved change
              {dirtyCodes.length === 1 ? "" : "s"}
            </p>
            <button
              type="button"
              onClick={() => setPrices(original)}
              className="text-sm font-semibold text-secondary hover:text-on-surface"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={savePrices}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save prices"}
            </button>
          </div>
        )}

        {/* Two columns, spelled out, so nobody has to guess which number is
            which — "400" against "Alger" is ambiguous on a phone screen. */}
        <div className="hidden sm:grid grid-cols-[auto_1fr_auto_auto] gap-2 px-3 pb-1 text-[11px] uppercase tracking-wider text-secondary">
          <span className="w-7">#</span>
          <span>Wilaya</span>
          <span className="w-24 text-right">To the door</span>
          <span className="w-24 text-right">Stop desk</span>
        </div>

        <div className="space-y-1">
          {visible.map((w) => {
            const row = prices[w.code] ?? EMPTY;
            const wasRow = original[w.code] ?? EMPTY;
            const changed =
              (row.home ?? "") !== (wasRow.home ?? "") ||
              (row.desk ?? "") !== (wasRow.desk ?? "");
            return (
              <div
                key={w.code}
                className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 rounded-xl border px-3 py-2 ${
                  changed
                    ? "border-primary/50 bg-primary-container/10"
                    : "border-outline-variant/20 bg-surface-container-low"
                }`}
              >
                <span className="w-7 text-xs font-semibold text-secondary">
                  {w.code}
                </span>
                <span className="text-sm text-on-surface truncate">{w.name}</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  inputMode="numeric"
                  value={row.home ?? ""}
                  onChange={(e) => setPrice(w.code, "home", e.target.value)}
                  className="w-24 form-input py-1.5 text-sm text-right"
                  aria-label={`Door delivery price for ${w.name}`}
                  placeholder="—"
                />
                <input
                  type="number"
                  min="0"
                  step="50"
                  inputMode="numeric"
                  value={row.desk ?? ""}
                  onChange={(e) => setPrice(w.code, "desk", e.target.value)}
                  className="w-24 form-input py-1.5 text-sm text-right"
                  aria-label={`Stop-desk price for ${w.name}`}
                  placeholder="—"
                />
              </div>
            );
          })}
        </div>

        {visible.length === 0 && (
          <p className="py-8 text-center text-secondary text-sm">
            No wilaya matches “{search}”.
          </p>
        )}

        <button
          type="button"
          onClick={savePrices}
          disabled={saving || dirtyCodes.length === 0 || tableMissing}
          className="mt-5 px-6 py-3 rounded-xl bg-primary text-on-primary font-label-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save all prices
        </button>
      </div>
    </div>
  );
}
