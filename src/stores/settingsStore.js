import { create } from "zustand";
import supabase from "../lib/supabase";
import {
  DELIVERY_MODES,
  REGHAIA_OUTSKIRTS_DZD,
  WILAYA_HOME_PRICES,
  normalizeWilayaCode,
  stopDeskExtraFor,
} from "../lib/shipping";
import { WILAYAS } from "../lib/wilayas";

/*
 * Delivery prices live in the database now (`delivery_zones` and
 * `store_settings`), so the admin can change them without a rebuild.
 *
 * Every wilaya carries two numbers: the door price and the stop-desk price.
 * The fallback below is the courier's printed card — what the shop shipped
 * with — used for the first paint, for a database that has not had
 * SUPABASE_UPGRADE.sql run yet, and for an offline customer.
 */

const FALLBACK_ZONES = WILAYAS.map((w) => ({
  code: w.code,
  price: WILAYA_HOME_PRICES[w.code] ?? 0,
  // Older projects have no stopdesk column; the surcharge rule still gives a
  // sane second number for the first paint.
  deskPrice: (WILAYA_HOME_PRICES[w.code] ?? 0) + stopDeskExtraFor(w.code),
}));

const useSettingsStore = create((set, get) => ({
  zones: FALLBACK_ZONES,
  reghaiaOutskirts: REGHAIA_OUTSKIRTS_DZD,
  freeDeliveryOver: 0,
  loaded: false,
  loading: false,

  fetchConfig: async () => {
    if (get().loading) return;
    set({ loading: true });

    try {
      // `stopdesk_dzd` only exists once SUPABASE_UPGRADE.sql has run. Asking
      // for it on an older project makes Postgres reject the whole query and
      // drops the shop back to the built-in card — so the second read is the
      // one without it, used only when the first fails.
      let zonesRes = await supabase
        .from("delivery_zones")
        .select("wilaya_code, price_dzd, stopdesk_dzd");

      if (zonesRes.error) {
        zonesRes = await supabase
          .from("delivery_zones")
          .select("wilaya_code, price_dzd");
      }

      const settingsRes = await supabase
        .from("store_settings")
        .select("key, value")
        .in("key", ["reghaia_outskirts_dzd", "free_delivery_over_dzd"]);

      if (Array.isArray(zonesRes.data) && zonesRes.data.length > 0) {
        set({
          zones: zonesRes.data.map((row) => {
            const code = normalizeWilayaCode(row.wilaya_code);
            const price = Math.max(0, Number(row.price_dzd) || 0);
            const desk =
              row.stopdesk_dzd === null || row.stopdesk_dzd === undefined
                ? price + stopDeskExtraFor(code)
                : Math.max(0, Number(row.stopdesk_dzd) || 0);
            return { code, price, deskPrice: desk };
          }),
        });
      }

      if (Array.isArray(settingsRes.data)) {
        const valueOf = (key) => {
          const row = settingsRes.data.find((r) => r.key === key);
          if (!row || row.value === null || row.value === undefined) return null;
          const n = Number(row.value);
          return Number.isFinite(n) ? Math.max(0, n) : null;
        };

        const outskirts = valueOf("reghaia_outskirts_dzd");
        const freeOver = valueOf("free_delivery_over_dzd");

        set({
          ...(outskirts !== null ? { reghaiaOutskirts: outskirts } : {}),
          ...(freeOver !== null ? { freeDeliveryOver: freeOver } : {}),
        });
      }
    } catch {
      // Keep the fallback prices — a settings outage must not close the shop.
    } finally {
      set({ loaded: true, loading: false });
    }
  },

  /**
   * The price for one wilaya, or null when we do not know it.
   * `deliveryType` is 'domicile' (to the door) or 'bureau' (stop desk).
   */
  feeForWilaya: (code, deliveryType = "domicile") => {
    const wanted = normalizeWilayaCode(code);
    if (!wanted || wanted === "00") return null;

    const fromDb = get().zones.find((z) => z.code === wanted);
    if (fromDb) {
      return deliveryType === "bureau" ? fromDb.deskPrice : fromDb.price;
    }

    const fallback = FALLBACK_ZONES.find((z) => z.code === wanted);
    if (!fallback) return null;
    return deliveryType === "bureau" ? fallback.deskPrice : fallback.price;
  },

  /**
   * The same three-mode answer the checkout and the place_order() RPC use.
   * `null` means "not known yet" (for example, no wilaya chosen).
   */
  shippingFor: ({
    mode,
    wilayaCode,
    reghaiaZone,
    subtotal = 0,
    deliveryType = "domicile",
  } = {}) => {
    if (!mode) return null;

    if (mode === DELIVERY_MODES.UNIVERSITY) return 0;

    if (mode === DELIVERY_MODES.REGHAIA) {
      return reghaiaZone === "outskirts" ? get().reghaiaOutskirts : 0;
    }

    if (mode === DELIVERY_MODES.WILAYA) {
      const fee = get().feeForWilaya(wilayaCode, deliveryType);
      if (fee === null) return null;

      const freeOver = get().freeDeliveryOver;
      if (freeOver > 0 && Number(subtotal) >= freeOver) return 0;
      return fee;
    }

    return null;
  },
}));

export default useSettingsStore;
