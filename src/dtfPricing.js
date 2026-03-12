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
export const DEFAULT_PRESS_CYCLE_SEC = 40; // full cycle: load + pre-press + press + peel + unload
export const DEFAULT_DTF_SETUP_MIN = 5;
export const DEFAULT_SUPPLIER_SHIPPING = 0.15; // amortized per unit
export const DEFAULT_SETUP_ART_FEE = 25; // one-time
export const DEFAULT_WASTE_PCT = 3; // press waste / misprints %
export const DEFAULT_SMALL_ORDER_FEE = 10; // orders under threshold
export const SMALL_ORDER_THRESHOLD = 6;

export const DEFAULT_QTY_DISCOUNTS = [
  { minQty: 1, discountPct: 0 },
  { minQty: 12, discountPct: 5 },
  { minQty: 48, discountPct: 10 },
  { minQty: 100, discountPct: 15 },
  { minQty: 250, discountPct: 20 },
  { minQty: 500, discountPct: 25 },
];

export const DTF_QTY_TIERS = [
  { label: "1", min: 1, max: 11, rep: 1 },
  { label: "12-47", min: 12, max: 47, rep: 24 },
  { label: "48-99", min: 48, max: 99, rep: 48 },
  { label: "100-249", min: 100, max: 249, rep: 100 },
  { label: "250-499", min: 250, max: 499, rep: 250 },
  { label: "500+", min: 500, max: Infinity, rep: 500 },
];

export const MARKUP_PRESETS = [
  { label: "Economy", pct: 100 },
  { label: "Standard", pct: 150 },
  { label: "Premium", pct: 200 },
  { label: "Platform", pct: 250 },
];

// Common blank garment presets
export const GARMENT_PRESETS = [
  { label: "None", cost: 0 },
  { label: "Gildan 5000", cost: 2.50 },
  { label: "Gildan 64000", cost: 3.25 },
  { label: "Bella+Canvas 3001", cost: 4.50 },
  { label: "Next Level 6210", cost: 5.50 },
  { label: "Comfort Colors 1717", cost: 5.75 },
  { label: "Hoodie (avg)", cost: 12.00 },
];

// Gang sheet sizes — common supplier options
export const GANG_SHEET_SIZES = [
  { label: '22"×60"', w: 22, h: 60, cost: 20 },
  { label: '22"×120"', w: 22, h: 120, cost: 40 },
  { label: '22"×180"', w: 22, h: 180, cost: 55 },
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
 * Calculate how many transfers fit on a gang sheet.
 * Uses simple grid packing (no rotation optimization).
 */
export function calcGangSheetFit(sheetW, sheetH, transferW, transferH) {
  // Try both orientations
  const fit1 = Math.floor(sheetW / transferW) * Math.floor(sheetH / transferH);
  const fit2 = Math.floor(sheetW / transferH) * Math.floor(sheetH / transferW);
  return Math.max(fit1, fit2);
}

/**
 * Calculate effective per-transfer cost from gang sheet.
 */
export function calcGangSheetCost(sheetCost, sheetW, sheetH, transferW, transferH) {
  const fits = calcGangSheetFit(sheetW, sheetH, transferW, transferH);
  if (fits <= 0) return { fits: 0, costPerTransfer: Infinity, wastePercent: 100 };
  const usedArea = fits * transferW * transferH;
  const totalArea = sheetW * sheetH;
  const wastePercent = ((totalArea - usedArea) / totalArea) * 100;
  return { fits, costPerTransfer: sheetCost / fits, wastePercent };
}

/**
 * Calculate DTF pricing for a job.
 * customerDiscountPct is applied to sell price (customer volume discount).
 * Supplier volume discount reduces cost via qtyDiscounts.
 */
export function calcDTFPrice(transferCost, qty, markupPct, garmentCost, garmentMarkup, qtyDiscounts, opts = {}) {
  const {
    shippingPerUnit = 0, rushPct = 0, setupArtFee = 0, wastePct = 0,
    numPlacements = 1, smallOrderFee = 0, customerDiscountPct = 0,
  } = opts;
  const discountPct = getQtyDiscount(qty, qtyDiscounts);
  const discountedCost = transferCost * (1 - discountPct / 100);
  const costWithWaste = discountedCost * (1 + wastePct / 100);
  const totalTransferCost = costWithWaste * numPlacements + shippingPerUnit;
  const rushMultiplier = 1 + rushPct / 100;
  const baseSellPerTransfer = totalTransferCost * (1 + markupPct / 100) * rushMultiplier;
  const sellPerTransfer = baseSellPerTransfer * (1 - customerDiscountPct / 100);
  const garmentSell = garmentCost * (1 + garmentMarkup / 100);
  const sellPerUnit = sellPerTransfer + garmentSell;
  const costPerUnit = totalTransferCost + garmentCost;
  const profitPerUnit = sellPerUnit - costPerUnit;
  const marginPct = sellPerUnit > 0 ? (profitPerUnit / sellPerUnit) * 100 : 0;
  const orderTotal = sellPerUnit * qty + setupArtFee + smallOrderFee;

  return {
    discountPct,
    discountedCost,
    totalTransferCost,
    sellPerTransfer,
    garmentSell,
    sellPerUnit,
    costPerUnit,
    profitPerUnit,
    marginPct,
    orderTotal,
    setupArtFee,
    smallOrderFee,
    customerDiscountPct,
  };
}

/**
 * Calculate DTF production time.
 * pressCycleSec = full cycle per unit (load + pre-press + press + peel + unload)
 */
export function calcDTFTime(qty, pressCycleSec, setupMinutes, numPlacements = 1) {
  const pressMinutes = (pressCycleSec * qty * numPlacements) / 60;
  const totalMinutes = setupMinutes + pressMinutes;
  return { setupMinutes, pressMinutes, totalMinutes, totalHours: totalMinutes / 60 };
}

/**
 * Build a rate card: rows = preset sizes, columns = qty tiers.
 * Returns sell price per unit for each combination (includes garment if provided).
 */
export function buildDTFRateCard(supplierCosts, markupPct, qtyDiscounts, opts = {}) {
  const { wastePct = 0, numPlacements = 1, garmentSell = 0 } = opts;
  return DTF_SIZE_PRESETS.map((preset) => {
    const cost = supplierCosts[preset.key] ?? preset.cost;
    return DTF_QTY_TIERS.map((tier) => {
      const discountPct = getQtyDiscount(tier.rep, qtyDiscounts);
      const discountedCost = cost * (1 - discountPct / 100);
      const costWithWaste = discountedCost * (1 + wastePct / 100);
      return costWithWaste * numPlacements * (1 + markupPct / 100) + garmentSell;
    });
  });
}
