/**
 * ── How an order is priced ───────────────────────────────────────────────
 * One place to change delivery and tax. The basket, the cart summary and the
 * checkout all read from here, so they can never disagree with each other.
 *
 * Decided 2 October 2026:
 *   • Delivery is a flat 500 DZD on every order. There is no free-delivery
 *     threshold — a small basket and a large one cost the same to send.
 *   • No tax line. The price shown on the product is the price paid, which is
 *     how Algerian shops normally present it — nice and simple for a customer
 *     paying cash on the doorstep.
 *
 * ── To change what delivery costs ────────────────────────────────────────
 * DELIVERY_FEE_DZD is typed in DINARS, the way you'd say it out loud. Set it
 * to 0 to go back to free delivery. To waive the fee on larger baskets, set
 * FREE_DELIVERY_OVER_DZD to the threshold in dinars:
 *
 *     export const DELIVERY_FEE_DZD = 500;
 *     export const FREE_DELIVERY_OVER_DZD = 5000;   // free from 5,000 DZD up
 *
 * That is the whole change — no other file needs touching. (Under the hood
 * the shop keeps prices in USD and converts them for display; the numbers in
 * this file are converted for you, so you never have to think about that.)
 */

import { DZD_RATE, usdToDzd } from "./currency";

/** Delivery charge in DZD. 0 = free delivery, and no fee line is added. */
export const DELIVERY_FEE_DZD = 500;

/** Baskets of at least this many DZD get free delivery. 0 = no threshold. */
export const FREE_DELIVERY_OVER_DZD = 0;

/** Percentage added to the order. 0 = no tax line is shown at all. 19 = TVA. */
export const TAX_PERCENT = 0;

/** What delivery costs for a basket of this size (internal price units). */
export function deliveryFor(subtotal) {
  if (DELIVERY_FEE_DZD <= 0) return 0;
  const subtotalDzd = usdToDzd(subtotal);
  if (FREE_DELIVERY_OVER_DZD > 0 && subtotalDzd >= FREE_DELIVERY_OVER_DZD) return 0;
  return DELIVERY_FEE_DZD / DZD_RATE;
}

/** What tax is added on top of this amount. */
export function taxFor(amount) {
  if (TAX_PERCENT <= 0) return 0;
  return Number(amount) * (TAX_PERCENT / 100);
}

/** True when the customer should see a tax row in their order summary. */
export const SHOW_TAX_LINE = TAX_PERCENT > 0;
