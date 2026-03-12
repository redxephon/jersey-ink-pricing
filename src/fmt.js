/**
 * Shared price formatting — single source of truth.
 * @param {number} val
 * @returns {string} e.g. "$12.50"
 */
export function fmt(val) {
  if (!isFinite(val)) return "$0.00";
  return "$" + val.toFixed(2);
}

/**
 * Format with thousands separators for larger values (used in Shop Economics).
 * @param {number} val
 * @returns {string} e.g. "$1,234.56"
 */
export function fmtK(val) {
  if (!isFinite(val)) return "$0";
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
