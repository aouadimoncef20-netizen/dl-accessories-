const DZD_RATE = 135; // 1 USD ≈ 135 DZD

export function usdToDzd(usd) {
  return Math.round(usd * DZD_RATE);
}

export function formatDZD(usd) {
  const dzd = usdToDzd(usd);
  return `${dzd.toLocaleString("en-DZ")} DZD`;
}
