// ════════════════════════════════════════════════════════════
//  Money
// ════════════════════════════════════════════════════════════
//  Every price in this shop is in Algerian dinars. Nothing
//  converts anything.
//
//  It did not used to be that way: prices were typed in dollars
//  and multiplied by 135 on the way to the screen, so the number
//  in the admin form was never the number on the shop front.
//  One currency end to end means there is nothing to convert and
//  therefore nothing to get wrong.
//
//  What the admin types is what the customer pays.
// ════════════════════════════════════════════════════════════

/** "4,500 DZD" — the one place a price is turned into words. */
export function formatDZD(amount) {
  const dinars = Math.round(Number(amount) || 0);
  return `${dinars.toLocaleString("en-DZ")} DZD`;
}
