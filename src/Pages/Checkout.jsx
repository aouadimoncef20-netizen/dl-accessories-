import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useCartStore from "../stores/cartStore";
import useProductStore from "../stores/productStore";
import useAuthStore from "../stores/authStore";
import useSettingsStore from "../stores/settingsStore";
import SEO from "../Component/SEO";
import { formatDZD } from "../lib/currency";
import {
  SHOW_TAX_LINE,
  DELIVERY_MODES,
  UNIVERSITY_CAMPUSES,
  findUniversity,
} from "../lib/shipping";
import { WILAYAS, wilayaLabel } from "../lib/wilayas";
import { fetchServedWilayas, fetchCommunes, bookParcel } from "../lib/dhd";
import { phoneDigits } from "../lib/productOptions";
import { validateCoupon, normalizeCouponCode } from "../lib/coupons";
import useTranslation from "../i18n/useTranslation";

// The three choices at the top of the page. `key` is what we store in the
// order's `delivery_type`; the rest is presentation.
const DELIVERY_OPTIONS = [
  {
    key: DELIVERY_MODES.UNIVERSITY,
    icon: "school",
    titleKey: "checkout_mode_university",
    descKey: "checkout_mode_university_desc",
  },
  {
    key: DELIVERY_MODES.REGHAIA,
    icon: "location_city",
    titleKey: "checkout_mode_reghaia",
    descKey: "checkout_mode_reghaia_desc",
  },
  {
    key: DELIVERY_MODES.WILAYA,
    icon: "local_shipping",
    titleKey: "checkout_mode_wilaya",
    descKey: "checkout_mode_wilaya_desc",
  },
];

/** One labelled field: label, input, then the error or the hint. */
function Field({ id, label, required, error, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className="block font-label-md text-secondary mb-1.5">
        {label}
        {required && (
          <span className="text-error ms-1" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-error text-sm mt-1">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="text-xs text-secondary mt-1">
          {hint}
        </p>
      )}
    </div>
  );
}

const inputClass = (invalid) =>
  `w-full form-input font-body-md ${invalid ? "border-error" : ""}`;

function Checkout() {
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const subtotal = useCartStore((s) => s.subtotal());
  const tax = useCartStore((s) => s.tax());
  const discount = useCartStore((s) => s.discount);
  const discountAmount = useCartStore((s) => s.discountAmount());
  const setDiscount = useCartStore((s) => s.setDiscount);
  const clearDiscount = useCartStore((s) => s.clearDiscount);
  const clearCart = useCartStore((s) => s.clearCart);
  const giftWrap = useCartStore((s) => s.giftWrap);
  const createOrder = useProductStore((s) => s.createOrder);
  const decrementStock = useProductStore((s) => s.decrementStock);
  const checkStock = useProductStore((s) => s.checkStock);
  const user = useAuthStore((s) => s.user);

  // Delivery prices come from the database (see SUPABASE_UPGRADE.sql), so the
  // admin can change a wilaya price without a rebuild. Until the settings
  // arrive, the store falls back to the same bands the app shipped with.
  const fetchConfig = useSettingsStore((s) => s.fetchConfig);
  const shippingFor = useSettingsStore((s) => s.shippingFor);
  const reghaiaOutskirts = useSettingsStore((s) => s.reghaiaOutskirts);
  const zones = useSettingsStore((s) => s.zones);
  const freeDeliveryOver = useSettingsStore((s) => s.freeDeliveryOver);

  const [errors, setErrors] = useState({});
  const [stockProblems, setStockProblems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  // A refusal from the database (stock ran out, coupon expired…) — shown
  // instead of sending the customer to a confirmation for an order that
  // does not exist.
  const [orderError, setOrderError] = useState("");
  const { t } = useTranslation();

  // The delivery mode is chosen first; everything below it changes with it.
  const [mode, setMode] = useState(null);

  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    // University
    university: "",
    // Réghaïa
    reghaiaAddress: "",
    reghaiaNote: "",
    reghaiaZone: "ville",
    // Other wilayas
    address: "",
    state: "",
    commune: "",
    addressNote: "",
    // Anything the customer wants to tell the shop — a gift note, "call me
    // before you come", a colour they'd rather have. Optional in every mode.
    comment: "",
  });

  // Promo code. The discount itself lives in the cart store so the summary,
  // the total and (on the server) place_order() all read the same thing.
  const [couponCode, setCouponCode] = useState(discount?.code || "");
  const [couponError, setCouponError] = useState("");
  const [couponBusy, setCouponBusy] = useState(false);

  // 'domicile' = to the customer's door, 'bureau' = they collect it from a
  // DHD office. Only used by the wilaya mode.
  const [deliveryType, setDeliveryType] = useState("domicile");
  const [communes, setCommunes] = useState([]);
  const [communesLoading, setCommunesLoading] = useState(false);
  // null until we know — while unknown we offer every wilaya rather than
  // none, because a courier outage must not close the shop.
  const [servedWilayas, setServedWilayas] = useState(null);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // A returning customer should not retype their name and phone. The name
  // comes from the account; the phone is remembered on this device after the
  // first order.
  useEffect(() => {
    if (!user?.name) return;
    setForm((prev) => (prev.fullName ? prev : { ...prev, fullName: user.name }));
  }, [user]);

  useEffect(() => {
    try {
      const savedPhone = localStorage.getItem("dl_customer_phone");
      if (savedPhone) {
        setForm((prev) => (prev.phone ? prev : { ...prev, phone: savedPhone }));
      }
    } catch {}
  }, []);

  useEffect(() => {
    let alive = true;
    fetchServedWilayas().then((codes) => {
      if (alive) setServedWilayas(codes);
    });
    return () => {
      alive = false;
    };
  }, []);

  // DHD carries to 55 of the 58 wilayas. Offering one they don't serve would
  // take an order that can never be delivered.
  const offeredWilayas = useMemo(
    () =>
      servedWilayas
        ? WILAYAS.filter((w) => servedWilayas.includes(w.code))
        : WILAYAS,
    [servedWilayas]
  );

  useEffect(() => {
    if (!form.state) {
      setCommunes([]);
      return;
    }
    let alive = true;
    setCommunesLoading(true);
    fetchCommunes(form.state).then((list) => {
      if (!alive) return;
      setCommunes(list);
      setCommunesLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [form.state]);

  const deskCommunes = useMemo(
    () => communes.filter((c) => c.hasStopDesk),
    [communes]
  );
  const communeOptions = deliveryType === "bureau" ? deskCommunes : communes;
  const chosenCommune =
    communeOptions.find((c) => c.nom === form.commune) || null;

  // Switching to "bureau" can leave a commune with no office selected —
  // clear it rather than post an impossible combination.
  useEffect(() => {
    if (deliveryType !== "bureau" || !form.commune) return;
    if (!deskCommunes.some((c) => c.nom === form.commune)) {
      setForm((prev) => ({ ...prev, commune: "" }));
    }
  }, [deliveryType, form.commune, deskCommunes]);

  // Delivery is priced from the mode chosen above, so the fee and the total
  // change the moment the customer picks a campus, a Réghaïa zone or a
  // wilaya. Until the answer is known the summary says so instead of
  // showing delivery as free.
  const shippingCost = useMemo(
    () =>
      shippingFor({
        mode,
        wilayaCode: form.state,
        reghaiaZone: form.reghaiaZone,
        subtotal,
        deliveryType,
      }),
    // `zones`, `reghaiaOutskirts` and `freeDeliveryOver` are the database
    // values shippingFor() reads, so the total updates when they arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, form.state, form.reghaiaZone, subtotal, deliveryType, zones, reghaiaOutskirts, freeDeliveryOver]
  );

  // The two prices the customer is choosing between, shown on the buttons so
  // nobody has to select a delivery type to find out what it costs.
  const homePrice = useMemo(
    () =>
      mode === DELIVERY_MODES.WILAYA
        ? shippingFor({ mode, wilayaCode: form.state, subtotal, deliveryType: "domicile" })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, form.state, subtotal, zones, freeDeliveryOver]
  );
  const deskPrice = useMemo(
    () =>
      mode === DELIVERY_MODES.WILAYA
        ? shippingFor({ mode, wilayaCode: form.state, subtotal, deliveryType: "bureau" })
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, form.state, subtotal, zones, freeDeliveryOver]
  );

  const total = subtotal - discountAmount + (shippingCost || 0) + tax;
  // While the delivery price is unknown (no wilaya picked yet), `total` is the
  // goods alone. Saying so beats a number that quietly grows at the till.
  const totalExcludesDelivery = shippingCost === null;

  // The basket can change after a code is applied — a line removed, a quantity
  // dropped. A code with a minimum spend stops applying the moment the basket
  // falls below it, and place_order() would then refuse the whole order. Drop
  // it here, with the reason, instead of letting the customer find out at the
  // last step.
  useEffect(() => {
    if (!discount) return;
    const min = Number(discount.min_subtotal) || 0;
    if (min > 0 && subtotal < min) {
      clearDiscount();
      setCouponCode("");
      setCouponError(t("checkout_coupon_min"));
    }
  }, [discount, subtotal, clearDiscount, t]);

  const selectMode = (next) => {
    setMode(next);
    setErrors({});
    setStockProblems([]);
    setOrderError("");
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // A commune belongs to one wilaya — changing wilaya must not leave the
      // previous wilaya's commune behind.
      ...(name === "state" ? { commune: "" } : {}),
    }));
    setErrors((prev) => ({
      ...prev,
      [name]: "",
      ...(name === "state" ? { commune: "" } : {}),
    }));
    setOrderError("");
  };

  const validate = () => {
    // No mode means none of the fields are on screen — ask for the choice
    // first, then focus the first card.
    if (!mode) {
      setErrors({ mode: t("checkout_choose_mode") });
      document.getElementById("mode-university")?.focus();
      return false;
    }

    const errs = {};
    if (!form.fullName.trim()) errs.fullName = t("checkout_required_field");

    const digits = phoneDigits(form.phone);
    if (!digits) errs.phone = t("checkout_required_field");
    else if (digits.length < 9 || digits.length > 10) {
      errs.phone = t("checkout_phone_invalid");
    }

    if (mode === DELIVERY_MODES.UNIVERSITY && !form.university) {
      errs.university = t("checkout_required_field");
    }

    if (mode === DELIVERY_MODES.REGHAIA && !form.reghaiaAddress.trim()) {
      errs.reghaiaAddress = t("checkout_required_field");
    }

    if (mode === DELIVERY_MODES.WILAYA) {
      if (!form.address.trim()) errs.address = t("checkout_required_field");
      if (!form.state.trim()) errs.state = t("checkout_required_field");
      // A wilaya we have no price for cannot be delivered — say it here
      // rather than letting the order fail on the server.
      else if (shippingCost === null) {
        errs.state = t("checkout_error_no_delivery");
      }
      // Desk collection needs a real DHD office: without one the courier
      // refuses the parcel and the shop is left with an order it has to
      // deliver by hand at the stop-desk price. Say it here, before submit.
      if (
        deliveryType === "bureau" &&
        !communesLoading &&
        communes.length > 0 &&
        deskCommunes.length === 0
      ) {
        errs.commune = t("checkout_no_desk");
      } else if (communeOptions.length > 0 && !form.commune.trim()) {
        // Required only when there is something to choose from: if the commune
        // list couldn't be loaded, the order is still taken and the admin sends
        // it to the courier afterwards.
        errs.commune = t("checkout_required_field");
      }
    }

    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) document.getElementById(first)?.focus();
    return Object.keys(errs).length === 0;
  };

  const applyCoupon = async () => {
    const code = normalizeCouponCode(couponCode);
    if (!code) {
      setCouponError("");
      return;
    }

    setCouponBusy(true);
    setCouponError("");

    const result = await validateCoupon(code, subtotal);
    setCouponBusy(false);

    if (!result.ok) {
      clearDiscount();
      setCouponError(
        result.reason === "min_subtotal"
          ? t("checkout_coupon_min")
          : result.reason === "offline"
            ? t("checkout_coupon_offline")
            : t("checkout_coupon_invalid")
      );
      return;
    }

    setDiscount(result.discount);
    setCouponCode(result.discount.code);
  };

  const removeCoupon = () => {
    clearDiscount();
    setCouponCode("");
    setCouponError("");
  };

  /** A refusal from the database, in the customer's language. */
  const orderErrorMessage = (order) => {
    switch (order?.code) {
      case "out_of_stock":
        return t("checkout_error_out_of_stock").replace(
          "{name}",
          order.errorName || ""
        );
      case "no_delivery_price":
        return t("checkout_error_no_delivery");
      case "coupon_invalid":
        return t("checkout_coupon_invalid");
      case "coupon_min_subtotal":
        return t("checkout_coupon_min");
      case "name_required":
        return t("checkout_error_name");
      case "cart_empty":
        return t("checkout_error_cart");
      case "product_not_found":
        return t("checkout_error_product");
      default:
        return t("checkout_error_generic");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setStockProblems([]);
    setOrderError("");

    // Ask the database what is actually left before we promise anything.
    const stock = await checkStock(items);
    if (!stock.ok) {
      setStockProblems(stock.problems);
      setSubmitting(false);
      return;
    }

    // The three modes write different things into the same order columns:
    //   university → address = campus, state = "Université"
    //   reghaia    → address = address + note, state = ville/périphérie
    //   wilaya     → the full DHD address, commune and wilaya code
    let delivery;
    if (mode === DELIVERY_MODES.UNIVERSITY) {
      const campus = findUniversity(form.university);
      delivery = {
        address: [campus?.name, campus?.city].filter(Boolean).join(" — "),
        state: "Université",
        wilaya_code: null,
        commune: null,
        delivery_type: "universite",
      };
    } else if (mode === DELIVERY_MODES.REGHAIA) {
      const note = form.reghaiaNote.trim();
      delivery = {
        // The note rides with the address: it is the driver's instruction,
        // and the admin sees the whole thing in one place.
        address: note
          ? `${form.reghaiaAddress.trim()} — ${note}`
          : form.reghaiaAddress.trim(),
        state:
          form.reghaiaZone === "outskirts"
            ? "Réghaïa (périphérie)"
            : "Réghaïa (ville)",
        wilaya_code: null,
        commune: null,
        delivery_type: "reghaia",
      };
    } else {
      // The note is a driver instruction, so it belongs with the address.
      const note = form.addressNote.trim();
      delivery = {
        address: note
          ? `${form.address.trim()} — ${note}`
          : form.address.trim(),
        // Stored as "16 - Alger", not "16": the code alone means nothing to
        // whoever packs the parcel.
        state: wilayaLabel(form.state),
        // The courier's API wants the code and the commune, separately.
        wilaya_code: form.state,
        commune: form.commune || null,
        delivery_type: deliveryType,
      };
    }

    const order = await createOrder({
      user_id: user?.id || null,
      customer_name: form.fullName,
      phone: form.phone,
      ...delivery,
      // The mode and zone let the database price the delivery itself instead
      // of trusting the number this page worked out.
      mode,
      reghaia_zone:
        mode === DELIVERY_MODES.REGHAIA ? form.reghaiaZone : null,
      coupon_code: discount?.code || null,
      // The customer's own words to the shop — shown in the dashboard next to
      // the order. The driver's landmark still rides with the address above;
      // this one is for the owner.
      customer_note: [giftWrap ? t("checkout_gift_note") : "", form.comment.trim()]
        .filter(Boolean)
        .join(" — ") || null,
      // `variant` (ring size / watch finish) is what the customer chose —
      // it has to reach the order or the admin cannot pack the right thing.
      // `color`/`size` are the same choice as data, so place_order() can take
      // the stock off the exact combination that sold.
      items: items.map((i) => ({
        id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        image: i.image,
        ...(i.variant ? { variant: i.variant } : {}),
        ...(i.color ? { color: i.color } : {}),
        ...(i.size ? { size: i.size } : {}),
      })),
      total: total,
      status: "pending",
    });

    // A real refusal (stock ran out between the check and the insert, an
    // expired coupon, no price for that wilaya) — keep the basket and say
    // what happened. Never show a confirmation for an order that failed.
    if (order.saved === false && order.code && order.code !== "rpc_missing") {
      setSubmitting(false);
      setOrderError(orderErrorMessage(order));

      if (order.code === "out_of_stock") {
        const fresh = await checkStock(items);
        if (!fresh.ok) setStockProblems(fresh.problems);
      }
      if (order.code === "coupon_invalid" || order.code === "coupon_min_subtotal") {
        removeCoupon();
      }
      return;
    }

    const saved = order.saved !== false;

    // Only touch stock for an order that really landed in the database, and
    // only when the database did not already take it (place_order does).
    let tracking = null;
    if (saved) {
      if (!order.stockHandled) {
        await decrementStock(items.map((i) => ({ id: i.id, qty: i.qty })));
      }

      // Only a wilaya order goes to DHD. Campus and Réghaïa orders are
      // delivered by the shop, so booking a parcel would be wrong (and DHD
      // would refuse it — those orders have no commune or wilaya code).
      if (mode === DELIVERY_MODES.WILAYA) {
        const booking = await bookParcel(order.id);
        tracking = booking.ok ? booking.tracking : null;
      }

      // Remember the phone on this device so the next order is quicker.
      try {
        localStorage.setItem("dl_customer_phone", form.phone);
      } catch {}
    }

    setSubmitting(false);

    const confirmationForm = {
      fullName: form.fullName,
      phone: form.phone,
      address: delivery.address,
      state: delivery.state,
      commune: delivery.commune || "",
    };

    if (!saved) {
      // Keep the basket intact so the customer can try again, and send them
      // to an honest "we couldn't save this" screen instead of a fake
      // confirmation.
      navigate("/order-confirmed", {
        state: {
          saved: false,
          form: confirmationForm,
          orderId: order.id,
          itemCount: items.length,
          deliveryMode: mode,
        },
      });
      return;
    }

    const confirmation = {
      saved: true,
      form: confirmationForm,
      orderId: order.id,
      tracking,
      total: order.total ?? total,
      itemCount: items.length,
      items: order.items || items,
      deliveryType: mode === DELIVERY_MODES.WILAYA ? deliveryType : null,
      deliveryMode: mode,
      createdAt: order.created_at || new Date().toISOString(),
    };

    // Survival across the redirect: if the confirmation page is refreshed it
    // can still show the order instead of bouncing the customer home.
    try {
      sessionStorage.setItem("dl_last_order", JSON.stringify(confirmation));
    } catch {}

    clearCart();
    navigate("/order-confirmed", { state: confirmation });
  };

  const shippingText =
    shippingCost === null
      ? mode === DELIVERY_MODES.WILAYA && form.state
        ? t("checkout_error_no_delivery")
        : mode === DELIVERY_MODES.WILAYA
          ? t("checkout_shipping_pick")
          : t("checkout_shipping_pick_mode")
      : shippingCost === 0
        ? t("checkout_free")
        : formatDZD(shippingCost);

  return (
    <main className="pt-32 pb-section-gap px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto">
      <SEO title={t("checkout_title")} description={t("checkout_title")} />
      <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg mb-10">
        {t("checkout_title")}
      </h1>

      <form onSubmit={handleSubmit} noValidate>
        {/* ── How it gets there ─────────────────────────────────────────
            The three buttons are the first decision on the page. Everything
            below them belongs to the chosen mode, so the customer only ever
            sees the fields that order actually needs. */}
        <fieldset className="mb-8">
          <legend className="font-headline-sm text-headline-sm text-on-surface mb-4">
            {t("checkout_mode_title")}
          </legend>
          <div
            role="radiogroup"
            aria-label={t("checkout_mode_title")}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3"
          >
            {DELIVERY_OPTIONS.map((option, index) => {
              const selected = mode === option.key;
              return (
                <button
                  key={option.key}
                  id={index === 0 ? "mode-university" : undefined}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={submitting}
                  onClick={() => selectMode(option.key)}
                  className={`relative flex items-start gap-3 rounded-2xl border p-4 text-start min-h-[96px] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    selected
                      ? "border-primary bg-primary-container/10 shadow-sm"
                      : "border-outline-variant/40 bg-surface hover:bg-surface-container-low"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-[24px] text-primary mt-0.5"
                    style={selected ? { fontVariationSettings: '"FILL" 1' } : undefined}
                    aria-hidden="true"
                  >
                    {option.icon}
                  </span>
                  <span className="min-w-0 pe-6">
                    <span className="block font-label-md text-on-surface">
                      {t(option.titleKey)}
                    </span>
                    <span className="block text-sm text-secondary mt-1 leading-snug">
                      {t(option.descKey)}
                    </span>
                  </span>
                  {selected && (
                    <span
                      className="material-symbols-outlined absolute top-3 end-3 text-[18px] text-primary"
                      style={{ fontVariationSettings: '"FILL" 1' }}
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {errors.mode && (
            <p role="alert" className="text-error text-sm mt-2">
              {errors.mode}
            </p>
          )}
        </fieldset>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
          <div className="lg:col-span-7 space-y-8">
            {!mode && (
              <section className="rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-low/40 p-8 text-center">
                <span
                  className="material-symbols-outlined text-4xl text-primary"
                  aria-hidden="true"
                >
                  delivery_dining
                </span>
                <p className="mt-3 text-body-md text-secondary">
                  {t("checkout_mode_prompt")}
                </p>
              </section>
            )}

            {mode && (
              <>
                {/* Name and phone are needed in every mode. */}
                <section>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                    {t("checkout_your_info")}
                  </h2>
                  <div className="space-y-5">
                    <Field
                      id="fullName"
                      label={t("checkout_full_name")}
                      required
                      error={errors.fullName}
                    >
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        autoComplete="name"
                        required
                        value={form.fullName}
                        onChange={handleChange}
                        aria-invalid={!!errors.fullName}
                        aria-describedby={errors.fullName ? "fullName-error" : undefined}
                        className={inputClass(errors.fullName)}
                        placeholder={t("checkout_full_name")}
                      />
                    </Field>
                    <Field
                      id="phone"
                      label={t("checkout_phone")}
                      required
                      error={errors.phone}
                    >
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        required
                        value={form.phone}
                        onChange={handleChange}
                        aria-invalid={!!errors.phone}
                        aria-describedby={errors.phone ? "phone-error" : undefined}
                        className={inputClass(errors.phone)}
                        placeholder="0555 12 34 56"
                      />
                    </Field>
                  </div>
                </section>

                {/* ── University ──────────────────────────────────────── */}
                {mode === DELIVERY_MODES.UNIVERSITY && (
                  <section>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                      {t("checkout_mode_university")}
                    </h2>
                    <Field
                      id="university"
                      label={t("checkout_university")}
                      required
                      error={errors.university}
                      hint={t("checkout_university_hint")}
                    >
                      <select
                        id="university"
                        name="university"
                        required
                        value={form.university}
                        onChange={handleChange}
                        aria-invalid={!!errors.university}
                        aria-describedby={
                          errors.university ? "university-error" : "university-hint"
                        }
                        className={inputClass(errors.university)}
                      >
                        <option value="">{t("checkout_university_pick")}</option>
                        {UNIVERSITY_CAMPUSES.map((campus) => (
                          <option key={campus.code} value={campus.code}>
                            {campus.name}
                            {campus.city ? ` — ${campus.city}` : ""}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </section>
                )}

                {/* ── Réghaïa ─────────────────────────────────────────── */}
                {mode === DELIVERY_MODES.REGHAIA && (
                  <section>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                      {t("checkout_mode_reghaia")}
                    </h2>
                    <div className="space-y-5">
                      {/* The zone is the price: town is free, the outskirts
                          are 200 DZD. Making it a visible choice is better
                          than guessing it from a typed address. */}
                      <fieldset>
                        <legend className="block font-label-md text-secondary mb-2">
                          {t("checkout_zone")}
                        </legend>
                        <div
                          role="radiogroup"
                          aria-label={t("checkout_zone")}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                        >
                          {[
                            {
                              value: "ville",
                              labelKey: "checkout_zone_town",
                              price: t("checkout_free"),
                            },
                            {
                              value: "outskirts",
                              labelKey: "checkout_zone_outskirts",
                              price:
                                reghaiaOutskirts > 0
                                  ? formatDZD(reghaiaOutskirts)
                                  : t("checkout_free"),
                            },
                          ].map((zone) => {
                            const selected = form.reghaiaZone === zone.value;
                            return (
                              <button
                                key={zone.value}
                                type="button"
                                role="radio"
                                aria-checked={selected}
                                onClick={() =>
                                  setForm((prev) => ({
                                    ...prev,
                                    reghaiaZone: zone.value,
                                  }))
                                }
                                className={`rounded-xl border px-4 py-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                  selected
                                    ? "border-primary bg-primary-container/10"
                                    : "border-outline-variant/40 hover:bg-surface-container-low"
                                }`}
                              >
                                <span className="block font-label-md text-on-surface">
                                  {t(zone.labelKey)}
                                </span>
                                <span className="block text-sm text-primary mt-0.5">
                                  {zone.price}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>

                      <Field
                        id="reghaiaAddress"
                        label={t("checkout_address_reghaia")}
                        required
                        error={errors.reghaiaAddress}
                      >
                        <input
                          id="reghaiaAddress"
                          name="reghaiaAddress"
                          type="text"
                          autoComplete="street-address"
                          required
                          value={form.reghaiaAddress}
                          onChange={handleChange}
                          aria-invalid={!!errors.reghaiaAddress}
                          aria-describedby={
                            errors.reghaiaAddress
                              ? "reghaiaAddress-error"
                              : undefined
                          }
                          className={inputClass(errors.reghaiaAddress)}
                          placeholder={t("checkout_address_reghaia_ph")}
                        />
                      </Field>

                      <Field
                        id="reghaiaNote"
                        label={t("checkout_note")}
                        hint={t("checkout_note_hint")}
                      >
                        <textarea
                          id="reghaiaNote"
                          name="reghaiaNote"
                          rows={2}
                          value={form.reghaiaNote}
                          onChange={handleChange}
                          aria-describedby="reghaiaNote-hint"
                          className="w-full form-input font-body-md resize-none"
                          placeholder={t("checkout_note_hint")}
                        />
                      </Field>
                    </div>
                  </section>
                )}

                {/* ── Other wilayas ───────────────────────────────────── */}
                {mode === DELIVERY_MODES.WILAYA && (
                  <section>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                      {t("checkout_delivery")}
                    </h2>
                    <div className="space-y-5">
                      <Field
                        id="address"
                        label={t("checkout_street")}
                        required
                        error={errors.address}
                      >
                        <input
                          id="address"
                          name="address"
                          type="text"
                          autoComplete="street-address"
                          required
                          value={form.address}
                          onChange={handleChange}
                          aria-invalid={!!errors.address}
                          aria-describedby={errors.address ? "address-error" : undefined}
                          className={inputClass(errors.address)}
                          placeholder={t("checkout_street")}
                        />
                      </Field>

                      <Field
                        id="state"
                        label={t("checkout_state")}
                        required
                        error={errors.state}
                      >
                        {/* A list, not a text box: the delivery price is
                            looked up from the wilaya code, and a hand-typed
                            wilaya can't be looked up at all. */}
                        <select
                          id="state"
                          name="state"
                          required
                          value={form.state}
                          onChange={handleChange}
                          aria-invalid={!!errors.state}
                          aria-describedby={errors.state ? "state-error" : undefined}
                          className={inputClass(errors.state)}
                        >
                          <option value="">{t("checkout_state")}</option>
                          {offeredWilayas.map((w) => (
                            <option key={w.code} value={w.code}>
                              {w.code} - {w.name}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <fieldset>
                        <legend className="block font-label-md text-secondary mb-2">
                          {t("checkout_delivery_type")}
                        </legend>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            {
                              value: "domicile",
                              label: t("checkout_delivery_home"),
                              icon: "home",
                              dzd: homePrice,
                            },
                            {
                              value: "bureau",
                              label: t("checkout_delivery_desk"),
                              icon: "storefront",
                              dzd: deskPrice,
                            },
                          ].map((option) => {
                            const selected = deliveryType === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setDeliveryType(option.value)}
                                className={`flex flex-col items-start gap-1 px-4 py-3 rounded-xl border font-body-md transition-colors text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                  selected
                                    ? "border-primary bg-primary-container/10 text-on-surface"
                                    : "border-outline-variant/40 text-secondary hover:bg-surface-container-low"
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">
                                    {option.icon}
                                  </span>
                                  {option.label}
                                </span>
                                {/* The price is the whole point of the
                                    choice, so it sits on the button. */}
                                <span className="text-xs text-secondary ps-7">
                                  {typeof option.dzd === "number"
                                    ? option.dzd === 0
                                      ? t("checkout_free")
                                      : formatDZD(option.dzd)
                                    : t("checkout_shipping_pick")}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </fieldset>

                      <Field
                        id="commune"
                        label={t("checkout_commune")}
                        required={communeOptions.length > 0}
                        error={errors.commune}
                      >
                        <select
                          id="commune"
                          name="commune"
                          required={communeOptions.length > 0}
                          value={form.commune}
                          onChange={handleChange}
                          disabled={!form.state || communesLoading}
                          aria-invalid={!!errors.commune}
                          aria-describedby={errors.commune ? "commune-error" : undefined}
                          className={`${inputClass(errors.commune)} disabled:opacity-60`}
                        >
                          <option value="">
                            {!form.state
                              ? t("checkout_commune_first")
                              : communesLoading
                                ? t("checkout_commune_loading")
                                : t("checkout_commune")}
                          </option>
                          {communeOptions.map((c) => (
                            <option key={c.nom} value={c.nom}>
                              {c.nom}
                              {c.codePostal ? ` (${c.codePostal})` : ""}
                            </option>
                          ))}
                        </select>
                      </Field>

                      {deliveryType === "bureau" &&
                        form.state &&
                        !communesLoading &&
                        deskCommunes.length === 0 && (
                          <p className="text-sm text-error" role="alert">
                            {t("checkout_no_desk")}
                          </p>
                        )}

                      {/* Where to go and when — only useful once they've
                          picked the office they're collecting from. */}
                      {deliveryType === "bureau" && chosenCommune?.deskInfo && (
                        <div className="rounded-xl bg-surface-container-low p-3 text-sm text-secondary space-y-0.5">
                          {chosenCommune.deskInfo.hub_location
                            ?.hub_location_adresse && (
                            <p>
                              {chosenCommune.deskInfo.hub_location.hub_location_adresse}
                            </p>
                          )}
                          {chosenCommune.deskInfo.hub_location
                            ?.hub_location_phone && (
                            <p>
                              {chosenCommune.deskInfo.hub_location.hub_location_phone}
                            </p>
                          )}
                          {(chosenCommune.deskInfo.hub_working_days || [])
                            .slice(0, 1)
                            .map((d) => (
                              <p key={d.day}>
                                {d.day}: {d.openTime}–{d.closeTime}
                              </p>
                            ))}
                        </div>
                      )}

                      {/* The courier needs a landmark or a floor to find the
                          door — it rides with the address. */}
                      <Field
                        id="addressNote"
                        label={t("checkout_note")}
                        hint={t("checkout_note_hint")}
                      >
                        <textarea
                          id="addressNote"
                          name="addressNote"
                          rows={2}
                          value={form.addressNote}
                          onChange={handleChange}
                          aria-describedby="addressNote-hint"
                          className="w-full form-input font-body-md resize-none"
                          placeholder={t("checkout_note_hint")}
                        />
                      </Field>
                    </div>
                  </section>
                )}

                <section>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                    {t("checkout_comment_title")}
                  </h2>
                  <Field
                    id="comment"
                    label={t("checkout_comment_label")}
                    hint={t("checkout_comment_hint")}
                  >
                    <textarea
                      id="comment"
                      name="comment"
                      rows={3}
                      maxLength={400}
                      value={form.comment}
                      onChange={handleChange}
                      aria-describedby="comment-hint"
                      className="w-full form-input font-body-md resize-none"
                      placeholder={t("checkout_comment_placeholder")}
                    />
                  </Field>
                </section>

                <section>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface mb-6">
                    {t("checkout_payment")}
                  </h2>
                  <div className="flex items-center gap-4 p-5 border border-primary/30 bg-primary-container/10 rounded-xl">
                    <span
                      className="material-symbols-outlined text-primary text-[28px]"
                      aria-hidden="true"
                    >
                      paid
                    </span>
                    <div>
                      <p className="font-label-md text-on-surface">
                        {t("checkout_cash")}
                      </p>
                      <p className="text-sm text-secondary">
                        {t("checkout_cash_desc")}
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}

            {orderError && (
              <div
                role="alert"
                className="rounded-2xl border border-error/40 bg-error/5 p-5"
              >
                <p className="font-label-md text-error mb-2">{orderError}</p>
                <Link
                  to="/cart"
                  className="inline-block font-label-sm text-primary underline underline-offset-4"
                >
                  {t("checkout_return_cart")}
                </Link>
              </div>
            )}

            {stockProblems.length > 0 && (
              <div role="alert" className="rounded-2xl border border-error/40 bg-error/5 p-5">
                <p className="font-label-md text-error mb-2">
                  {t("checkout_stock_changed")}
                </p>
                <ul className="space-y-1 text-sm text-on-surface-variant list-disc list-inside">
                  {stockProblems.map((p, i) => (
                    <li key={i}>
                      {p.available > 0
                        ? `${p.name} — ${t("checkout_only_left").replace("{n}", p.available)}`
                        : `${p.name} — ${t("checkout_out_of_stock")}`}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/cart"
                  className="inline-block mt-3 font-label-sm text-primary underline underline-offset-4"
                >
                  {t("checkout_return_cart")}
                </Link>
              </div>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-4">
              <Link
                to="/cart"
                className="flex items-center gap-2 text-secondary hover:text-primary transition-colors"
              >
                <span className="material-symbols-outlined">chevron_left</span>
                {t("checkout_return_cart")}
              </Link>
              {mode && (
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-container text-on-primary-container font-label-md uppercase tracking-widest py-4 px-12 rounded-full shadow-lg shadow-primary/10 hover:opacity-90 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[220px]"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-on-primary-container border-t-transparent rounded-full animate-spin" />
                      {t("checkout_processing")}
                    </>
                  ) : (
                    t("checkout_place_order")
                  )}
                </button>
              )}
            </div>
          </div>

          <aside className="lg:col-span-5 lg:sticky lg:top-32">
            <div className="glass-summary rounded-3xl p-8 border border-white/40 shadow-sm">
              <h2 className="font-headline-sm text-headline-sm text-on-surface mb-8">
                {t("checkout_order_summary")}
              </h2>
              <div className="space-y-6 mb-8 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {items.length > 0 ? (
                  items.map((item) => (
                    // Keyed by the line, not the product: two colours of the
                    // same bracelet are two rows here, and React must not
                    // reconcile one into the other.
                    <div
                      key={item.lineId || `${item.id}::${item.variant || ""}`}
                      className="flex items-center gap-6 group"
                    >
                      <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-2xl bg-surface-container-low overflow-hidden border border-outline-variant/30">
                          <img
                            className="w-full h-full object-cover"
                            src={item.image || "/placeholder-product.svg"}
                            alt={item.name}
                            onError={(e) => {
                              e.target.src = "/placeholder-product.svg";
                            }}
                          />
                        </div>
                        <span className="absolute -top-2 -right-2 w-6 h-6 bg-secondary text-white text-[10px] flex items-center justify-center rounded-full">
                          {item.qty}
                        </span>
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-label-md text-on-surface">
                          {item.name}
                        </h3>
                        {item.variant && (
                          <p className="font-label-sm text-secondary">
                            {item.variant}
                          </p>
                        )}
                      </div>
                      <span className="font-label-md text-primary">
                        {formatDZD(item.price * item.qty)}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-secondary text-center py-8">
                    {t("checkout_cart_empty")}
                  </p>
                )}
              </div>

              {/* A promo code changes what the customer pays, so it belongs
                  next to the total, not on a separate step. */}
              <div className="pt-6 border-t border-outline-variant/20">
                <label
                  htmlFor="coupon"
                  className="block font-label-md text-secondary mb-1.5"
                >
                  {t("checkout_coupon")}
                </label>
                <div className="flex gap-2">
                  <input
                    id="coupon"
                    name="coupon"
                    type="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck="false"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value);
                      setCouponError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (!discount) applyCoupon();
                      }
                    }}
                    disabled={!!discount || couponBusy}
                    className="flex-1 form-input font-body-md uppercase placeholder:normal-case disabled:opacity-60"
                    placeholder={t("checkout_coupon")}
                  />
                  {discount ? (
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="px-4 rounded-xl border border-outline-variant/40 text-secondary hover:bg-surface-container-low font-label-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {t("checkout_coupon_remove")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={applyCoupon}
                      disabled={couponBusy || !couponCode.trim()}
                      className="px-4 rounded-xl bg-primary text-on-primary font-label-sm transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {couponBusy
                        ? t("checkout_processing")
                        : t("checkout_coupon_apply")}
                    </button>
                  )}
                </div>
                {couponError && (
                  <p role="alert" className="text-error text-sm mt-1.5">
                    {couponError}
                  </p>
                )}
                {discount && (
                  <p className="flex items-center gap-1.5 text-sm text-primary mt-1.5">
                    <span
                      className="material-symbols-outlined text-[18px]"
                      aria-hidden="true"
                    >
                      check_circle
                    </span>
                    <span className="font-label-sm">{discount.code}</span>
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-8 border-t border-outline-variant/20">
                <div className="flex justify-between items-center text-body-md">
                  <span className="text-secondary">{t("checkout_subtotal")}</span>
                  <span className="text-on-surface">{formatDZD(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-body-md">
                    <span className="text-secondary">
                      {t("checkout_discount")}
                      {discount?.code ? ` · ${discount.code}` : ""}
                    </span>
                    <span className="text-primary">
                      −{formatDZD(discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center text-body-md">
                  <span className="text-secondary">{t("checkout_shipping")}</span>
                  <span className="text-on-surface">{shippingText}</span>
                </div>
                {/* Free, but the customer needs to see that the request they
                    made on the bag page is travelling with the order. */}
                {giftWrap && (
                  <div className="flex justify-between items-center text-body-md">
                    <span className="text-secondary">{t("cart_gift_wrap")}</span>
                    <span className="text-primary">{t("checkout_free")}</span>
                  </div>
                )}
                {SHOW_TAX_LINE && (
                  <div className="flex justify-between items-center text-body-md">
                    <span className="text-secondary">{t("summary_taxes")}</span>
                    <span className="text-on-surface">{formatDZD(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-6 mt-4 border-t border-outline-variant/50">
                  <span className="font-headline-sm text-headline-sm">
                    {t("checkout_total")}
                  </span>
                  {/* formatDZD already ends in "DZD" — a second label above
                      it printed the currency twice. */}
                  <span className="font-display-lg text-[32px] text-primary">
                    {formatDZD(total)}
                  </span>
                </div>
                {totalExcludesDelivery && (
                  <p className="text-end text-xs text-secondary">
                    {t("checkout_total_before_delivery")}
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </form>
    </main>
  );
}

export default Checkout;
