// DTF pricing — outsourced model (transfer cost + markup)

export const DTF_SIZE_PRESETS = [
  { key: "left-chest", label: "Left Chest", w: 3.5, h: 3.5, cost: 1.25 },
  { key: "pocket", label: "Pocket", w: 4, h: 4, cost: 1.50 },
  { key: "standard", label: "Standard", w: 10, h: 10, cost: 3.50 },
  { key: "full-front", label: "Full Front", w: 12, h: 14, cost: 5.00 },
  { key: "oversize", label: "Oversize", w: 14, h: 16, cost: 7.00 },
  { key: "sleeve", label: "Sleeve", w: 3, h: 10, cost: 2.00 },
];

export const DEFAULT_COST_PER_SQ_IN = 0.03;
export const DEFAULT_DTF_MARKUP = 150;
export const DEFAULT_PRESS_TIME_SEC = 15;
export const DEFAULT_DTF_SETUP_MIN = 5;

export const DEFAULT_QTY_DISCOUNTS = [
  { minQty: 1, discountPct: 0 },
  { minQty: 12, discountPct: 5 },
  { minQty: 48, discountPct: 10 },
  { minQty: 100, discountPct: 15 },
  { minQty: 250, discountPct: 20 },
];

export const DTF_QTY_TIERS = [
  { label: "1", min: 1, max: 11, rep: 1 },
  { label: "12-47", min: 12, max: 47, rep: 24 },
  { label: "48-99", min: 48, max: 99, rep: 48 },
  { label: "100-249", min: 100, max: 249, rep: 100 },
  { label: "250+", min: 250, max: Infinity, rep: 250 },
];

/**
 * Get applicable qty discount percentage.
 */
export function getQtyDiscount(qty, discounts) {
  let disc = 0;
  for (const d of discounts) {
    if (qty >= d.minQty) disc = d.discountPct;
  }
  return disc;
}

/**
 * Calculate DTF pricing for a job.
 */
export function calcDTFPrice(transferCost, qty, markupPct, garmentCost, garmentMarkup, qtyDiscounts) {
  const discountPct = getQtyDiscount(qty, qtyDiscounts);
  const discountedCost = transferCost * (1 - discountPct / 100);
  const sellPerTransfer = discountedCost * (1 + markupPct / 100);
  const garmentSell = garmentCost * (1 + garmentMarkup / 100);
  const sellPerUnit = sellPerTransfer + garmentSell;
  const costPerUnit = discountedCost + garmentCost;
  const profitPerUnit = sellPerUnit - costPerUnit;
  const marginPct = sellPerUnit > 0 ? (profitPerUnit / sellPerUnit) * 100 : 0;
  const orderTotal = sellPerUnit * qty;

  return {
    discountPct,
    discountedCost,
    sellPerTransfer,
    garmentSell,
    sellPerUnit,
    costPerUnit,
    profitPerUnit,
    marginPct,
    orderTotal,
  };
}

/**
 * Calculate DTF production time.
 */
export function calcDTFTime(qty, pressTimeSec, setupMinutes) {
  const pressMinutes = (pressTimeSec * qty) / 60;
  const totalMinutes = setupMinutes + pressMinutes;
  return { setupMinutes, pressMinutes, totalMinutes, totalHours: totalMinutes / 60 };
}

/**
 * Build a rate card: rows = preset sizes, columns = qty tiers.
 * Returns sell price per unit for each combination.
 */
export function buildDTFRateCard(supplierCosts, markupPct, qtyDiscounts) {
  return DTF_SIZE_PRESETS.map((preset) => {
    const cost = supplierCosts[preset.key] ?? preset.cost;
    return DTF_QTY_TIERS.map((tier) => {
      const discountPct = getQtyDiscount(tier.rep, qtyDiscounts);
      const discountedCost = cost * (1 - discountPct / 100);
      return discountedCost * (1 + markupPct / 100);
    });
  });
}
