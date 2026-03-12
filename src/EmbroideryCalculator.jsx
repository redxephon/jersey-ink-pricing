import { useState, useMemo } from "react";
import {
  EMB_STITCH_TIERS, EMB_QTY_TIERS, DEFAULT_EMB_PRICES,
  EMB_OVERFLOW_RATE, EMB_FEES, EMB_SIZING, lookupEmbPrice,
} from "./embroideryData";
import { calcEmbroideryTime, calcJobScore, calcShopRates } from "./jobAnalysis";
import ProfitAlerts from "./ProfitAlerts";

function fmt(v) { return "$" + v.toFixed(2); }

export default function EmbroideryCalculator({ shopEconomics }) {
  const [stitchTierIdx, setStitchTierIdx] = useState(5); // 7-8K default
  const [customStitchCount, setCustomStitchCount] = useState(25000);
  const [qty, setQty] = useState(48);
  const [embPrices, setEmbPrices] = useState(() => DEFAULT_EMB_PRICES.map((r) => [...r]));
  const [overflowRate, setOverflowRate] = useState(EMB_OVERFLOW_RATE);
  const [digitizingFee, setDigitizingFee] = useState(EMB_FEES.digitizingSmall.amount);
  const [garmentCost, setGarmentCost] = useState(0);
  const [garmentMarkup, setGarmentMarkup] = useState(0);
  // Fee toggles
  const [includeCaps, setIncludeCaps] = useState(false);
  const [includeFleece, setIncludeFleece] = useState(false);
  const [include3DPuff, setInclude3DPuff] = useState(false);
  const [includeCustomName, setIncludeCustomName] = useState(false);
  const [includeMetallic, setIncludeMetallic] = useState(false);
  const [includeFoldBag, setIncludeFoldBag] = useState(false);
  const [includeUnbag, setIncludeUnbag] = useState(false);
  const [includeOuterwear, setIncludeOuterwear] = useState(false);
  const [foldBagType, setFoldBagType] = useState("tshirt");
  // New features
  const [threadColors, setThreadColors] = useState(1);
  const [numHeads, setNumHeads] = useState(1);
  const [numLocations, setNumLocations] = useState(1);
  const [rushFee, setRushFee] = useState(0); // 0, 25, or 50 percent
  const [isRepeatOrder, setIsRepeatOrder] = useState(false);
  const [activeTab, setActiveTab] = useState("card");
  const [targetHourlyRate, setTargetHourlyRate] = useState(75);

  const isOverflow = stitchTierIdx === -1;
  const stitchCount = isOverflow ? customStitchCount : Math.round((EMB_STITCH_TIERS[stitchTierIdx].min + EMB_STITCH_TIERS[stitchTierIdx].max) / 2);

  const perUnitFees = useMemo(() => {
    let fees = 0;
    if (includeCaps) fees += EMB_FEES.caps.amount;
    if (includeFleece) fees += EMB_FEES.fleece.amount;
    if (include3DPuff) fees += EMB_FEES.puff3d.amount;
    if (includeCustomName) fees += EMB_FEES.customName.amount;
    if (includeMetallic) fees += EMB_FEES.metallic.amount;
    if (includeFoldBag) fees += foldBagType === "hoodie" ? EMB_FEES.foldBagHoodie.amount : EMB_FEES.foldBagTshirt.amount;
    if (includeUnbag) fees += EMB_FEES.unbag.amount;
    if (includeOuterwear) fees += EMB_FEES.outerwear.amount;
    return fees;
  }, [includeCaps, includeFleece, include3DPuff, includeCustomName, includeMetallic, includeFoldBag, includeUnbag, includeOuterwear, foldBagType]);

  const garmentSell = garmentCost * (1 + garmentMarkup / 100);
  const effectiveDigitizing = isRepeatOrder ? 0 : digitizingFee;

  const embPrice = useMemo(() => {
    const basePrice = lookupEmbPrice(stitchCount, qty, embPrices, EMB_STITCH_TIERS, EMB_QTY_TIERS, overflowRate);
    return basePrice * numLocations;
  }, [stitchCount, qty, embPrices, overflowRate, numLocations]);

  const rushMultiplier = 1 + rushFee / 100;
  const allInPerUnit = (embPrice + perUnitFees) * rushMultiplier + garmentSell;
  const costPerUnit = embPrice * 0.45 + perUnitFees + garmentCost;
  const profitPerUnit = allInPerUnit - costPerUnit;
  const marginPct = allInPerUnit > 0 ? (profitPerUnit / allInPerUnit) * 100 : 0;
  const orderTotal = allInPerUnit * qty + effectiveDigitizing * numLocations;

  const pressTime = useMemo(() => calcEmbroideryTime(stitchCount * numLocations, qty, threadColors, numHeads), [stitchCount, qty, threadColors, numHeads, numLocations]);
  const totalProfit = profitPerUnit * qty;
  const dollarsPerHour = pressTime.totalHours > 0 ? totalProfit / pressTime.totalHours : 0;

  const jobScore = useMemo(() => {
    return calcJobScore(marginPct, dollarsPerHour, totalProfit, 1.0, targetHourlyRate);
  }, [marginPct, dollarsPerHour, totalProfit, targetHourlyRate]);

  const shopRates = useMemo(() => calcShopRates(shopEconomics), [shopEconomics]);

  const activeQtyCol = useMemo(() => {
    for (let i = EMB_QTY_TIERS.length - 1; i >= 0; i--) {
      if (qty >= EMB_QTY_TIERS[i].min) return i;
    }
    return -1;
  }, [qty]);

  const handleCellClick = (rowIdx, colIdx) => {
    setStitchTierIdx(rowIdx);
    setQty(EMB_QTY_TIERS[colIdx].rep);
  };

  const updatePrice = (row, col, value) => {
    setEmbPrices((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = Math.max(0, Number(value) || 0);
      return next;
    });
  };

  const minProfitableQty = useMemo(() => {
    for (let q = 1; q <= 1000; q++) {
      const price = lookupEmbPrice(stitchCount, q, embPrices, EMB_STITCH_TIERS, EMB_QTY_TIERS, overflowRate) * numLocations;
      const allIn = (price + perUnitFees) * rushMultiplier + garmentSell;
      const cost = price * 0.45 + perUnitFees + garmentCost;
      const profit = (allIn - cost) * q;
      const time = calcEmbroideryTime(stitchCount * numLocations, q, threadColors, numHeads);
      if (time.totalHours > 0 && profit / time.totalHours >= targetHourlyRate) return q;
    }
    return null;
  }, [stitchCount, embPrices, overflowRate, perUnitFees, garmentSell, garmentCost, targetHourlyRate, numLocations, threadColors, numHeads, rushMultiplier]);

  const isSmallOrder = qty < 6;

  return (
    <>
      {/* Quick Price Check */}
      <div className="panel p-4 mb-4">
        <h2 className="section-label mb-3">Quick Price Check</h2>

        <div className="flex flex-wrap items-end gap-5 mb-3">
          {/* Stitch Range */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Stitch Range</label>
            <select
              className="rf-select"
              value={stitchTierIdx}
              onChange={(e) => setStitchTierIdx(Number(e.target.value))}
              style={{ padding: "7px 10px", fontSize: 13, minWidth: 140 }}
            >
              {EMB_STITCH_TIERS.map((t, i) => (
                <option key={i} value={i}>{t.label}</option>
              ))}
              <option value={-1}>20,001+</option>
            </select>
          </div>

          {isOverflow && (
            <div>
              <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Exact Stitch Count</label>
              <input
                type="number" min={20001} step={1000} value={customStitchCount}
                onChange={(e) => setCustomStitchCount(Math.max(20001, Number(e.target.value)))}
                className="field-editable"
                style={{ width: 110, padding: "7px 10px", textAlign: "center", fontSize: 14, fontWeight: 600 }}
              />
            </div>
          )}

          <div style={{ width: 1, height: 32, background: "var(--border-subtle)", alignSelf: "flex-end" }} />

          {/* Quantity */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Quantity</label>
            <input
              type="number" min={1} value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className="field-editable"
              style={{ width: 100, padding: "7px 10px", textAlign: "center", fontSize: 14, fontWeight: 600 }}
            />
          </div>

          <div style={{ width: 1, height: 32, background: "var(--border-subtle)", alignSelf: "flex-end" }} />

          {/* Thread Colors */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Thread Colors</label>
            <input
              type="number" min={1} max={15} value={threadColors}
              onChange={(e) => setThreadColors(Math.max(1, Math.min(15, Number(e.target.value))))}
              className="field-editable"
              style={{ width: 60, padding: "7px 10px", textAlign: "center", fontSize: 14, fontWeight: 600 }}
            />
          </div>

          {/* Machine Heads */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Heads</label>
            <input
              type="number" min={1} max={12} value={numHeads}
              onChange={(e) => setNumHeads(Math.max(1, Math.min(12, Number(e.target.value))))}
              className="field-editable"
              style={{ width: 60, padding: "7px 10px", textAlign: "center", fontSize: 14, fontWeight: 600 }}
            />
          </div>

          {/* Locations */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Locations</label>
            <input
              type="number" min={1} max={5} value={numLocations}
              onChange={(e) => setNumLocations(Math.max(1, Math.min(5, Number(e.target.value))))}
              className="field-editable"
              style={{ width: 60, padding: "7px 10px", textAlign: "center", fontSize: 14, fontWeight: 600 }}
            />
          </div>

          <div style={{ width: 1, height: 32, background: "var(--border-subtle)", alignSelf: "flex-end" }} />

          {/* Digitizing */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Digitizing Fee</label>
            <div style={{ position: "relative" }}>
              <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-muted)", pointerEvents: "none" }}>$</span>
              <input
                type="number" min={0} step={5} value={digitizingFee}
                onChange={(e) => setDigitizingFee(Math.max(0, Number(e.target.value)))}
                className="field-editable"
                style={{
                  width: 80, padding: "7px 10px 7px 20px", textAlign: "center", fontSize: 13, fontWeight: 600,
                  opacity: isRepeatOrder ? 0.4 : 1,
                }}
                disabled={isRepeatOrder}
              />
            </div>
          </div>
        </div>

        {/* Fee Toggles + Rush + Repeat */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          {[
            { label: `Caps (+${fmt(EMB_FEES.caps.amount)})`, checked: includeCaps, set: setIncludeCaps },
            { label: `Fleece (+${fmt(EMB_FEES.fleece.amount)})`, checked: includeFleece, set: setIncludeFleece },
            { label: `3D Puff (+${fmt(EMB_FEES.puff3d.amount)})`, checked: include3DPuff, set: setInclude3DPuff },
            { label: `Custom Name (+${fmt(EMB_FEES.customName.amount)})`, checked: includeCustomName, set: setIncludeCustomName },
            { label: `Metallic (+${fmt(EMB_FEES.metallic.amount)})`, checked: includeMetallic, set: setIncludeMetallic },
            { label: `Unbag (+${fmt(EMB_FEES.unbag.amount)})`, checked: includeUnbag, set: setIncludeUnbag },
            { label: `Outerwear (+${fmt(EMB_FEES.outerwear.amount)})`, checked: includeOuterwear, set: setIncludeOuterwear },
          ].map(({ label, checked, set }) => (
            <label key={label} className="flex items-center gap-1.5 cursor-pointer select-none">
              <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="rf-check" />
              {label}
            </label>
          ))}
          <span style={{ color: "var(--border-medium)" }}>|</span>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={includeFoldBag} onChange={(e) => setIncludeFoldBag(e.target.checked)} className="rf-check" />
            Fold/Bag
          </label>
          {includeFoldBag && (
            <select className="rf-select" value={foldBagType} onChange={(e) => setFoldBagType(e.target.value)} style={{ padding: "2px 6px", fontSize: 11 }}>
              <option value="tshirt">T-shirt ({fmt(EMB_FEES.foldBagTshirt.amount)})</option>
              <option value="hoodie">Hoodie ({fmt(EMB_FEES.foldBagHoodie.amount)})</option>
            </select>
          )}
        </div>

        {/* Rush + Repeat row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Rush:</span>
          {[
            { label: "None", value: 0 },
            { label: "+25%", value: 25 },
            { label: "+50%", value: 50 },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRushFee(opt.value)}
              style={{
                padding: "3px 10px", borderRadius: "var(--radius-sm)", fontSize: 11, cursor: "pointer",
                border: rushFee === opt.value ? "1px solid var(--fund-amber)" : "1px solid var(--border-subtle)",
                background: rushFee === opt.value ? "rgba(251, 191, 36, 0.1)" : "transparent",
                color: rushFee === opt.value ? "var(--fund-amber)" : "var(--text-muted)",
                fontWeight: rushFee === opt.value ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
          <span style={{ color: "var(--border-medium)" }}>|</span>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input type="checkbox" checked={isRepeatOrder} onChange={(e) => setIsRepeatOrder(e.target.checked)} className="rf-check" />
            <span style={{ fontWeight: 500 }}>Repeat Order</span>
            {isRepeatOrder && <span style={{ color: "var(--ji-green)" }}>(no digitizing)</span>}
          </label>
        </div>

        {/* Garment Cost */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          <label className="flex items-center gap-1.5 select-none">
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Garment Cost</span>
            <span>$</span>
            <input
              type="number" min={0} step={0.01} value={garmentCost || ""} placeholder="0.00"
              onChange={(e) => setGarmentCost(Math.max(0, Number(e.target.value)))}
              className="field-editable"
              style={{ width: 80, padding: "3px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }}
            />
          </label>
          <label className="flex items-center gap-1.5 select-none">
            <span>Markup</span>
            <input
              type="number" min={0} step={1} value={garmentMarkup || ""} placeholder="0"
              onChange={(e) => setGarmentMarkup(Math.max(0, Number(e.target.value)))}
              className="field-editable"
              style={{ width: 56, padding: "3px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }}
            />
            <span>%</span>
          </label>
          {garmentCost > 0 && (
            <span className="tnum" style={{ color: "var(--text-secondary)", fontWeight: 500 }}>
              = {fmt(garmentSell)}/ea
            </span>
          )}
        </div>

        {/* Small Order Warning */}
        {isSmallOrder && (
          <div className="alert-warn mt-3 p-2 flex items-center gap-2" style={{ fontSize: 12 }}>
            <span style={{ fontWeight: 700 }}>Small Order</span>
            <span>Orders under 6 units have significantly higher per-unit costs. Consider raising the price or adding a small order surcharge.</span>
          </div>
        )}

        {/* Results */}
        <div className="results-grid mt-4">
          {/* Job Score */}
          <div className="panel-inset p-3" style={{ textAlign: "center" }}>
            <div className="kpi-label mb-2">Job Score</div>
            <div style={{
              width: 36, height: 36, borderRadius: "50%", margin: "0 auto 6px",
              background: jobScore.score >= 70 ? "var(--ji-green)" : jobScore.score >= 40 ? "var(--fund-amber)" : "var(--warn-red)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 700, color: "var(--bg-deep)", fontFamily: "'JetBrains Mono', monospace",
            }}>
              {jobScore.score}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {jobScore.dominantFactor}
            </div>
          </div>

          <div className="panel-inset p-3 text-right">
            <div className="kpi-label mb-1">Per Unit (all-in)</div>
            <div className="kpi-value" style={{ color: "var(--ji-green)" }}>{fmt(allInPerUnit)}</div>
            <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {fmt(embPrice)} emb{numLocations > 1 && ` (${numLocations}loc)`}
              {perUnitFees > 0 && <> + {fmt(perUnitFees)} fees</>}
              {garmentSell > 0 && <> + {fmt(garmentSell)} garment</>}
              {rushFee > 0 && <> + {rushFee}% rush</>}
            </div>
          </div>

          <div className="text-right">
            <div className="kpi-label">Digitizing</div>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 600, color: isRepeatOrder ? "var(--text-muted)" : "var(--text-primary)" }}>
              {isRepeatOrder ? "$0.00" : fmt(effectiveDigitizing * numLocations)}
            </div>
            <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {isRepeatOrder ? "repeat order" : `one-time${numLocations > 1 ? ` ×${numLocations}` : ""}`}
            </div>
          </div>

          <div className="text-right">
            <div className="kpi-label">Order Total</div>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: "var(--ji-green)" }}>
              {fmt(orderTotal)}
            </div>
            <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{qty} units</div>
          </div>

          <div className="text-right">
            <div className="kpi-label">Margin</div>
            <div className="tnum" style={{
              fontSize: 22, fontWeight: 700,
              color: marginPct >= 30 ? "var(--ji-green)" : marginPct >= 15 ? "var(--fund-amber)" : "var(--warn-red)",
            }}>
              {marginPct.toFixed(1)}%
            </div>
            <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {fmt(profitPerUnit)}/unit profit
            </div>
          </div>

          <div className="text-right">
            <div className="kpi-label">$/hr</div>
            <div className="tnum" style={{
              fontSize: 22, fontWeight: 700,
              color: dollarsPerHour >= (shopRates?.minShopRate || targetHourlyRate)
                ? "var(--ji-green)"
                : dollarsPerHour >= (shopRates?.minShopRate || targetHourlyRate) * 0.5
                  ? "var(--fund-amber)" : "var(--warn-red)",
            }}>
              {fmt(dollarsPerHour)}
            </div>
            <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              ~{pressTime.totalHours.toFixed(1)}hrs
              {numHeads > 1 && <> ({numHeads}h)</>}
            </div>
          </div>
        </div>

        {/* Profit Alerts */}
        <ProfitAlerts
          dollarsPerHour={dollarsPerHour}
          targetHourlyRate={targetHourlyRate}
          setTargetHourlyRate={setTargetHourlyRate}
          minProfitableQty={minProfitableQty}
          currentQty={qty}
          currentHourlyEarning={dollarsPerHour}
        />

        {/* Sizing Standards */}
        <div className="panel-inset p-3 mt-3">
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Max Design Sizes
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {EMB_SIZING.map((s) => (
              <span key={s.item}>
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{s.item}:</span> {s.size}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { id: "card", label: "Rate Card" },
          { id: "params", label: "Parameters" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? "btn-active" : "btn"}
            style={{
              padding: "6px 16px", fontSize: 12, borderRadius: "var(--radius-sm)",
              border: activeTab === tab.id ? "1px solid var(--ji-green)" : "1px solid var(--border-medium)",
              background: activeTab === tab.id ? "var(--bg-deep)" : "var(--bg-surface)",
              color: activeTab === tab.id ? "var(--ji-green)" : "var(--text-muted)",
              cursor: "pointer", fontWeight: activeTab === tab.id ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Rate Card */}
      {activeTab === "card" && (
        <div className="panel overflow-hidden mb-4">
          <div className="overflow-x-auto">
            <table className="rf-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", paddingLeft: 12, width: 90 }}>Stitches</th>
                  {EMB_QTY_TIERS.map((t, qi) => (
                    <th key={t.label} style={{
                      textAlign: "center",
                      color: qi === activeQtyCol ? "var(--ji-green)" : undefined,
                      background: qi === activeQtyCol ? "rgba(52, 211, 153, 0.08)" : undefined,
                    }}>{t.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {embPrices.map((row, si) => {
                  const isActiveRow = si === stitchTierIdx;
                  return (
                    <tr key={si} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ paddingLeft: 12, fontWeight: 600, fontSize: 12, color: isActiveRow ? "var(--ji-green)" : "var(--text-secondary)" }}>
                        {EMB_STITCH_TIERS[si].label}
                      </td>
                      {row.map((price, qi) => {
                        const isHighlighted = isActiveRow && qi === activeQtyCol;
                        const isColHighlight = qi === activeQtyCol;
                        return (
                          <td
                            key={qi}
                            onClick={() => handleCellClick(si, qi)}
                            style={{
                              textAlign: "center", padding: "7px 6px", cursor: "pointer",
                              background: isHighlighted ? "rgba(52, 211, 153, 0.12)"
                                : isColHighlight ? "rgba(52, 211, 153, 0.04)"
                                : isActiveRow ? "rgba(52, 211, 153, 0.04)" : undefined,
                              boxShadow: isHighlighted ? "inset 0 0 0 1px rgba(52, 211, 153, 0.3)" : undefined,
                              borderRadius: isHighlighted ? "var(--radius-sm)" : undefined,
                              transition: "background 0.15s ease",
                            }}
                          >
                            <span className="tnum" style={{ fontWeight: 600, color: isHighlighted ? "var(--ji-green)" : "var(--text-primary)", fontSize: 13 }}>
                              {fmt(price)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td style={{ paddingLeft: 12, fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>20,001+</td>
                  <td colSpan={10} style={{ fontSize: 11, color: "var(--text-muted)", paddingLeft: 8 }}>
                    19-20K price + ${overflowRate.toFixed(2)} per additional 1,000 stitches (rounded up)
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Parameters */}
      {activeTab === "params" && (
        <div className="panel p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="section-label">Embroidery Price Grid</h2>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Edit any cell to adjust pricing</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2" style={{ fontSize: 12, color: "var(--text-muted)" }}>
                <span style={{ fontWeight: 500 }}>Overflow $/1K</span>
                <input
                  type="number" min={0} step={0.10} value={overflowRate}
                  onChange={(e) => setOverflowRate(Math.max(0, Number(e.target.value)))}
                  className="field-editable"
                  style={{ width: 64, padding: "4px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }}
                />
              </label>
              <button
                onClick={() => { setEmbPrices(DEFAULT_EMB_PRICES.map((r) => [...r])); setOverflowRate(EMB_OVERFLOW_RATE); }}
                className="btn" style={{ fontSize: 12, padding: "5px 14px" }}
              >
                Reset to Default
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="rf-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", paddingLeft: 12, width: 90 }}>Stitches</th>
                  {EMB_QTY_TIERS.map((t) => (
                    <th key={t.label} style={{ textAlign: "center" }}>{t.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {embPrices.map((row, si) => (
                  <tr key={si} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ paddingLeft: 12, fontWeight: 600, fontSize: 12, color: "var(--text-secondary)" }}>
                      {EMB_STITCH_TIERS[si].label}
                    </td>
                    {row.map((price, qi) => (
                      <td key={qi} style={{ textAlign: "center", padding: "4px 2px" }}>
                        <input
                          type="number" min={0} step={0.05} value={price}
                          onChange={(e) => updatePrice(si, qi, e.target.value)}
                          className="field-editable tnum"
                          style={{ width: 64, padding: "3px 4px", textAlign: "center", fontSize: 12, fontWeight: 600 }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
