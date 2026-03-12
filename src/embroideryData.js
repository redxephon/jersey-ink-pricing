// Embroidery pricing data — Dan's actual rate chart (18 stitch tiers × 10 qty columns)

export const EMB_STITCH_TIERS = [
  { label: "Up to 3K", min: 0, max: 3000 },
  { label: "3-4K", min: 3001, max: 4000 },
  { label: "4-5K", min: 4001, max: 5000 },
  { label: "5-6K", min: 5001, max: 6000 },
  { label: "6-7K", min: 6001, max: 7000 },
  { label: "7-8K", min: 7001, max: 8000 },
  { label: "8-9K", min: 8001, max: 9000 },
  { label: "9-10K", min: 9001, max: 10000 },
  { label: "10-11K", min: 10001, max: 11000 },
  { label: "11-12K", min: 11001, max: 12000 },
  { label: "12-13K", min: 12001, max: 13000 },
  { label: "13-14K", min: 13001, max: 14000 },
  { label: "14-15K", min: 14001, max: 15000 },
  { label: "15-16K", min: 15001, max: 16000 },
  { label: "16-17K", min: 16001, max: 17000 },
  { label: "17-18K", min: 17001, max: 18000 },
  { label: "18-19K", min: 18001, max: 19000 },
  { label: "19-20K", min: 19001, max: 20000 },
];

export const EMB_QTY_TIERS = [
  { label: "1", min: 1, max: 1, rep: 1 },
  { label: "2-7", min: 2, max: 7, rep: 4 },
  { label: "8-23", min: 8, max: 23, rep: 12 },
  { label: "24-35", min: 24, max: 35, rep: 24 },
  { label: "36-47", min: 36, max: 47, rep: 36 },
  { label: "48-71", min: 48, max: 71, rep: 48 },
  { label: "72-143", min: 72, max: 143, rep: 72 },
  { label: "144-287", min: 144, max: 287, rep: 144 },
  { label: "288-499", min: 288, max: 499, rep: 288 },
  { label: "500+", min: 500, max: Infinity, rep: 500 },
];

// 18 rows × 10 columns — per-unit embroidery price from Dan's printed chart
// Rows: stitch tiers (Up to 3K → 19-20K)
// Cols: qty tiers (1, 2-7, 8-23, 24-35, 36-47, 48-71, 72-143, 144-287, 288-499, 500+)
export const DEFAULT_EMB_PRICES = [
  // Up to 3K
  [12.00, 8.00, 6.00, 5.25, 4.75, 4.25, 3.75, 3.25, 2.90, 2.60],
  // 3-4K
  [13.00, 8.75, 6.50, 5.75, 5.25, 4.75, 4.15, 3.60, 3.20, 2.90],
  // 4-5K
  [14.00, 9.50, 7.00, 6.25, 5.65, 5.10, 4.50, 3.90, 3.50, 3.15],
  // 5-6K
  [15.00, 10.25, 7.50, 6.75, 6.10, 5.50, 4.85, 4.25, 3.80, 3.40],
  // 6-7K
  [16.00, 11.00, 8.00, 7.25, 6.55, 5.90, 5.20, 4.55, 4.10, 3.65],
  // 7-8K
  [17.00, 11.75, 8.50, 7.65, 6.95, 6.25, 5.55, 4.85, 4.35, 3.90],
  // 8-9K
  [18.00, 12.50, 9.00, 8.10, 7.35, 6.65, 5.90, 5.15, 4.65, 4.15],
  // 9-10K
  [19.00, 13.25, 9.50, 8.55, 7.75, 7.00, 6.20, 5.45, 4.90, 4.40],
  // 10-11K
  [20.00, 14.00, 10.00, 9.00, 8.15, 7.40, 6.55, 5.75, 5.15, 4.65],
  // 11-12K
  [21.00, 14.75, 10.50, 9.45, 8.55, 7.75, 6.90, 6.05, 5.45, 4.90],
  // 12-13K
  [22.00, 15.50, 11.00, 9.90, 8.95, 8.15, 7.25, 6.35, 5.70, 5.15],
  // 13-14K
  [23.00, 16.25, 11.50, 10.35, 9.40, 8.50, 7.55, 6.65, 5.95, 5.40],
  // 14-15K
  [24.00, 17.00, 12.00, 10.80, 9.80, 8.90, 7.90, 6.95, 6.25, 5.65],
  // 15-16K — qty-1 raised ~15% vs original
  [29.00, 17.75, 12.50, 11.25, 10.20, 9.25, 8.25, 7.25, 6.50, 5.90],
  // 16-17K
  [30.00, 18.50, 13.00, 11.70, 10.60, 9.65, 8.55, 7.55, 6.80, 6.15],
  // 17-18K
  [32.00, 19.25, 13.50, 12.15, 11.00, 10.00, 8.90, 7.85, 7.05, 6.40],
  // 18-19K
  [33.00, 20.00, 14.00, 12.60, 11.40, 10.40, 9.25, 8.15, 7.35, 6.65],
  // 19-20K
  [35.00, 20.75, 14.50, 13.05, 11.85, 10.75, 9.55, 8.45, 7.60, 6.90],
];

export const EMB_OVERFLOW_RATE = 0.60; // per additional 1,000 stitches above 20K

// Additional fees
export const EMB_FEES = {
  digitizingSmall: { label: "Digitizing <6\" wide", amount: 45, type: "one-time" },
  digitizingLarge: { label: "Digitizing >6\" wide", amount: 75, type: "one-time" },
  caps: { label: "Headwear/Caps", amount: 1.50, type: "per-unit" },
  fleece: { label: "Fleece/Knitted/Pillows", amount: 1.75, type: "per-unit" },
  puff3d: { label: "3D Puff", amount: 2.25, type: "per-unit" },
  customName: { label: "Custom Name (up to 2 lines)", amount: 9.90, type: "per-unit" },
  metallic: { label: "Metallic Thread", amount: 1.25, type: "per-unit" },
  foldBagTshirt: { label: "T-shirt Fold/Bag/Sticker", amount: 0.60, type: "per-unit" },
  foldBagHoodie: { label: "Hoodie Fold/Bag/Sticker", amount: 0.90, type: "per-unit" },
  unbag: { label: "Unbagging", amount: 0.50, type: "per-unit" },
  outerwear: { label: "Heavy Jackets/Outerwear", amount: 2.50, type: "per-unit" },
};

// Sizing standards (reference only)
export const EMB_SIZING = [
  { item: "Max design (backs/jackets)", size: '9" × 9"' },
  { item: "Caps", size: '4" × 2.25"' },
  { item: "Back of caps", size: 'Max 3.45"H' },
  { item: "Beanies", size: '3" × 1.5"' },
  { item: "Custom names", size: '0.75"H × scale W (max 4"W)' },
];

/**
 * Look up embroidery price per unit.
 * @param {number} stitchCount — total stitch count
 * @param {number} qty — order quantity
 * @param {number[][]} prices — 18×10 price grid
 * @param {Array} stitchTiers — stitch tier definitions
 * @param {Array} qtyTiers — quantity tier definitions
 * @param {number} overflowRate — $/1000 stitches above 20K
 * @returns {number} per-unit price
 */
export function lookupEmbPrice(stitchCount, qty, prices, stitchTiers, qtyTiers, overflowRate) {
  // Find qty tier index
  let qtyIdx = qtyTiers.length - 1;
  for (let i = 0; i < qtyTiers.length; i++) {
    if (qty >= qtyTiers[i].min && qty <= qtyTiers[i].max) {
      qtyIdx = i;
      break;
    }
  }

  // If within 20K, find stitch tier
  if (stitchCount <= 20000) {
    let stitchIdx = 0;
    for (let i = 0; i < stitchTiers.length; i++) {
      if (stitchCount >= stitchTiers[i].min && stitchCount <= stitchTiers[i].max) {
        stitchIdx = i;
        break;
      }
      if (i === stitchTiers.length - 1) stitchIdx = i;
    }
    return prices[stitchIdx][qtyIdx];
  }

  // 20,001+ overflow: use 19-20K row price + $0.60 per additional 1,000 stitches (ceil)
  const basePrice = prices[17][qtyIdx]; // 19-20K row
  const extraStitches = stitchCount - 20000;
  const extraThousands = Math.ceil(extraStitches / 1000);
  return basePrice + extraThousands * overflowRate;
}
