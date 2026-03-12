// Decoration COGS estimator — lightweight auto-estimation for SP/EMB/DTF
// Used by WebstoreCalculator to pre-fill deco COGS based on decoration type

import {
  EMB_STITCH_TIERS,
  EMB_QTY_TIERS,
  DEFAULT_EMB_PRICES,
  EMB_OVERFLOW_RATE,
  lookupEmbPrice,
} from "./embroideryData";
import { DTF_SIZE_PRESETS } from "./dtfPricing";

export const DECO_TYPES = [
  { key: "custom", label: "--" },
  { key: "sp", label: "SP" },
  { key: "emb", label: "EMB" },
  { key: "dtf", label: "DTF" },
];

// Screen print cost params — mirrors ScreenPrintCalculator DEFAULT_PARAMS
export const SP_COST_PARAMS = [
  { screens: 1, setup: 44.17, variable: 0.8421 },
  { screens: 2, setup: 65.03, variable: 1.0258 },
  { screens: 3, setup: 95.57, variable: 1.1066 },
  { screens: 4, setup: 107.25, variable: 1.3436 },
  { screens: 5, setup: 189.87, variable: 1.1877 },
  { screens: 6, setup: 202.31, variable: 1.3252 },
];

const EMB_COGS_RATIO = 0.45;
const MIN_SP_AMORT_QTY = 12;

// Stitch tier midpoints for estimation (used as stitchCount input)
const STITCH_TIER_MIDPOINTS = EMB_STITCH_TIERS.map((t) =>
  t.max === Infinity ? t.min + 500 : Math.round((t.min + t.max) / 2)
);

/**
 * Estimate decoration COGS for a single item.
 * @param {"sp"|"emb"|"dtf"|"custom"} decoType
 * @param {number|string} decoParam — SP: screen count (1-6), EMB: stitch tier index (0-17), DTF: size preset key
 * @param {number} qty — item qty (used for EMB qty tier lookup)
 * @param {number} amortQty — total order qty (used for SP setup amortization)
 * @returns {number|null} estimated COGS per unit, or null if custom/unknown
 */
export function estimateDecoCogs(decoType, decoParam, qty, amortQty) {
  if (decoType === "custom") return null;

  if (decoType === "sp") {
    const screenIdx = Math.max(0, Math.min(5, (decoParam || 1) - 1));
    const { setup, variable } = SP_COST_PARAMS[screenIdx];
    const effectiveAmort = Math.max(amortQty, MIN_SP_AMORT_QTY);
    return setup / effectiveAmort + variable;
  }

  if (decoType === "emb") {
    const tierIdx = Math.max(0, Math.min(17, decoParam || 0));
    const stitchCount = STITCH_TIER_MIDPOINTS[tierIdx];
    const effectiveQty = Math.max(qty, 1);
    const sellPrice = lookupEmbPrice(
      stitchCount,
      effectiveQty,
      DEFAULT_EMB_PRICES,
      EMB_STITCH_TIERS,
      EMB_QTY_TIERS,
      EMB_OVERFLOW_RATE
    );
    return sellPrice * EMB_COGS_RATIO;
  }

  if (decoType === "dtf") {
    const preset = DTF_SIZE_PRESETS.find((p) => p.key === decoParam);
    return preset ? preset.cost : DTF_SIZE_PRESETS[2].cost; // fallback to "standard"
  }

  return null;
}

/**
 * Get parameter options for a given deco type (for dropdown).
 */
export function getDecoParamOptions(decoType) {
  if (decoType === "sp") {
    return SP_COST_PARAMS.map((p) => ({ value: p.screens, label: `${p.screens} scr` }));
  }
  if (decoType === "emb") {
    return EMB_STITCH_TIERS.map((t, i) => ({ value: i, label: t.label }));
  }
  if (decoType === "dtf") {
    return DTF_SIZE_PRESETS.map((p) => ({ value: p.key, label: p.label }));
  }
  return [];
}

/**
 * Get default param value for a deco type.
 */
export function getDefaultDecoParam(decoType) {
  if (decoType === "sp") return 2;
  if (decoType === "emb") return 5; // 7-8K tier
  if (decoType === "dtf") return "standard";
  return null;
}

/**
 * Build a human-readable tooltip explaining how the COGS was calculated.
 */
export function decoCogsTooltip(decoType, decoParam, qty, amortQty, result) {
  if (decoType === "custom" || !decoType || result == null) return "";
  const r = result.toFixed(2);

  if (decoType === "sp") {
    const screenIdx = Math.max(0, Math.min(5, (decoParam || 1) - 1));
    const { setup, variable } = SP_COST_PARAMS[screenIdx];
    const effectiveAmort = Math.max(amortQty, 12);
    return `SP ${decoParam} scr: $${setup.toFixed(2)} setup ÷ ${effectiveAmort} units + $${variable.toFixed(4)} var = $${r}`;
  }

  if (decoType === "emb") {
    const tierIdx = Math.max(0, Math.min(17, decoParam || 0));
    const stitchCount = STITCH_TIER_MIDPOINTS[tierIdx];
    const effectiveQty = Math.max(qty, 1);
    const sellPrice = lookupEmbPrice(stitchCount, effectiveQty, DEFAULT_EMB_PRICES, EMB_STITCH_TIERS, EMB_QTY_TIERS, EMB_OVERFLOW_RATE);
    return `EMB ${EMB_STITCH_TIERS[tierIdx].label} @ ${effectiveQty} qty: $${sellPrice.toFixed(2)} sell × 0.45 = $${r}`;
  }

  if (decoType === "dtf") {
    const preset = DTF_SIZE_PRESETS.find((p) => p.key === decoParam);
    const label = preset ? preset.label : "Standard";
    return `DTF ${label}: $${r} supplier cost`;
  }

  return "";
}
