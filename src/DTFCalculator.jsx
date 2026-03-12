import { useState, useMemo } from "react";
import {
  DTF_SIZE_PRESETS, DEFAULT_COST_PER_SQ_IN, DEFAULT_DTF_MARKUP,
  DEFAULT_PRESS_CYCLE_SEC, DEFAULT_DTF_SETUP_MIN, DEFAULT_QTY_DISCOUNTS,
  DEFAULT_SUPPLIER_SHIPPING, DEFAULT_SETUP_ART_FEE, DEFAULT_WASTE_PCT,
  DEFAULT_SMALL_ORDER_FEE, SMALL_ORDER_THRESHOLD,
  DTF_QTY_TIERS, MARKUP_PRESETS, GARMENT_PRESETS, GANG_SHEET_SIZES,
  calcDTFPrice, calcDTFTime, buildDTFRateCard, calcGangSheetCost,
} from "./dtfPricing";
import { calcJobScore, calcShopRates } from "./jobAnalysis";
import ProfitAlerts from "./ProfitAlerts";

function fmt(v) { return "$" + v.toFixed(2); }

export default function DTFCalculator({ shopEconomics }) {
  const [sizePreset, setSizePreset] = useState("standard");
  const [customW, setCustomW] = useState(8);
  const [customH, setCustomH] = useState(8);
  const [qty, setQty] = useState(48);
  const [markup, setMarkup] = useState(DEFAULT_DTF_MARKUP);
  const [supplierCosts, setSupplierCosts] = useState(() => {
    const costs = {};
    DTF_SIZE_PRESETS.forEach((p) => { costs[p.key] = p.cost; });
    return costs;
  });
  const [costPerSqIn, setCostPerSqIn] = useState(DEFAULT_COST_PER_SQ_IN);
  const [qtyDiscounts, setQtyDiscounts] = useState(() => DEFAULT_QTY_DISCOUNTS.map((d) => ({ ...d })));
  const [pressCycleSec, setPressCycleSec] = useState(DEFAULT_PRESS_CYCLE_SEC);
  const [setupMinutes, setSetupMinutes] = useState(DEFAULT_DTF_SETUP_MIN);
  const [garmentCost, setGarmentCost] = useState(0);
  const [garmentMarkup, setGarmentMarkup] = useState(0);
  const [activeTab, setActiveTab] = useState("card");
  const [targetHourlyRate, setTargetHourlyRate] = useState(75);
  const [shippingPerUnit, setShippingPerUnit] = useState(DEFAULT_SUPPLIER_SHIPPING);
  const [rushPct, setRushPct] = useState(0);
  const [setupArtFee, setSetupArtFee] = useState(DEFAULT_SETUP_ART_FEE);
  const [wastePct, setWastePct] = useState(DEFAULT_WASTE_PCT);
  const [numPlacements, setNumPlacements] = useState(1);
  const [smallOrderFee, setSmallOrderFee] = useState(DEFAULT_SMALL_ORDER_FEE);
  const [enableSmallOrderFee, setEnableSmallOrderFee] = useState(true);
  const [customerDiscountPct, setCustomerDiscountPct] = useState(0);
  // Gang sheet
  const [showGangSheet, setShowGangSheet] = useState(false);
  const [gangSheetIdx, setGangSheetIdx] = useState(0);
  // Rate card garment inclusion
  const [rateCardIncludeGarment, setRateCardIncludeGarment] = useState(false);

  const isCustom = sizePreset === "custom";
  const currentPreset = DTF_SIZE_PRESETS.find((p) => p.key === sizePreset);

  const transferW = isCustom ? customW : (currentPreset?.w ?? 10);
  const transferH = isCustom ? customH : (currentPreset?.h ?? 10);

  const transferCost = useMemo(() => {
    if (isCustom) return customW * customH * costPerSqIn;
    return supplierCosts[sizePreset] ?? currentPreset?.cost ?? 3.50;
  }, [isCustom, customW, customH, costPerSqIn, sizePreset, supplierCosts, currentPreset]);

  // Gang sheet calculation
  const gangSheet = GANG_SHEET_SIZES[gangSheetIdx];
  const gangSheetInfo = useMemo(() => {
    if (!gangSheet) return null;
    return calcGangSheetCost(gangSheet.cost, gangSheet.w, gangSheet.h, transferW, transferH);
  }, [gangSheet, transferW, transferH]);

  const isSmallOrder = qty < SMALL_ORDER_THRESHOLD;
  const effectiveSmallOrderFee = (isSmallOrder && enableSmallOrderFee) ? smallOrderFee : 0;

  const pricingOpts = useMemo(() => ({
    shippingPerUnit, rushPct, setupArtFee, wastePct, numPlacements,
    smallOrderFee: effectiveSmallOrderFee, customerDiscountPct,
  }), [shippingPerUnit, rushPct, setupArtFee, wastePct, numPlacements, effectiveSmallOrderFee, customerDiscountPct]);

  const pricing = useMemo(() => {
    return calcDTFPrice(transferCost, qty, markup, garmentCost, garmentMarkup, qtyDiscounts, pricingOpts);
  }, [transferCost, qty, markup, garmentCost, garmentMarkup, qtyDiscounts, pricingOpts]);

  const time = useMemo(() => calcDTFTime(qty, pressCycleSec, setupMinutes, numPlacements), [qty, pressCycleSec, setupMinutes, numPlacements]);

  const totalProfit = pricing.profitPerUnit * qty;
  const dollarsPerHour = time.totalHours > 0 ? totalProfit / time.totalHours : 0;

  const jobScore = useMemo(() => {
    return calcJobScore(pricing.marginPct, dollarsPerHour, totalProfit, 1.0, targetHourlyRate);
  }, [pricing.marginPct, dollarsPerHour, totalProfit, targetHourlyRate]);

  const shopRates = useMemo(() => calcShopRates(shopEconomics), [shopEconomics]);

  const garmentSell = garmentCost * (1 + garmentMarkup / 100);

  const rateCard = useMemo(() => {
    return buildDTFRateCard(supplierCosts, markup, qtyDiscounts, {
      wastePct, numPlacements, garmentSell: rateCardIncludeGarment ? garmentSell : 0,
    });
  }, [supplierCosts, markup, qtyDiscounts, wastePct, numPlacements, rateCardIncludeGarment, garmentSell]);

  const activeQtyCol = useMemo(() => {
    for (let i = DTF_QTY_TIERS.length - 1; i >= 0; i--) {
      if (qty >= DTF_QTY_TIERS[i].min) return i;
    }
    return -1;
  }, [qty]);

  const activePresetRow = DTF_SIZE_PRESETS.findIndex((p) => p.key === sizePreset);

  const minProfitableQty = useMemo(() => {
    for (let q = 1; q <= 1000; q++) {
      const soFee = (q < SMALL_ORDER_THRESHOLD && enableSmallOrderFee) ? smallOrderFee : 0;
      const p = calcDTFPrice(transferCost, q, markup, garmentCost, garmentMarkup, qtyDiscounts,
        { ...pricingOpts, smallOrderFee: soFee });
      const t = calcDTFTime(q, pressCycleSec, setupMinutes, numPlacements);
      const profit = p.profitPerUnit * q;
      if (t.totalHours > 0 && profit / t.totalHours >= targetHourlyRate) return q;
    }
    return null;
  }, [transferCost, markup, garmentCost, garmentMarkup, qtyDiscounts, pressCycleSec, setupMinutes, targetHourlyRate, pricingOpts, numPlacements, enableSmallOrderFee, smallOrderFee]);

  const updateDiscount = (idx, field, value) => {
    setQtyDiscounts((prev) => {
      const next = prev.map((d) => ({ ...d }));
      next[idx][field] = Number(value) || 0;
      return next;
    });
  };

  // Quote price = what the customer pays per unit, all-in
  const quotePrice = pricing.sellPerUnit;

  return (
    <>
      {/* Quick Price Check */}
      <div className="panel p-4 mb-4">
        <h2 className="section-label mb-3">Quick Price Check</h2>

        {/* Transfer Size — pill buttons */}
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Transfer Size</label>
          <div className="flex flex-wrap gap-2">
            {DTF_SIZE_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => setSizePreset(p.key)}
                style={{
                  padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: 12,
                  border: sizePreset === p.key ? "1px solid var(--ji-green)" : "1px solid var(--border-medium)",
                  background: sizePreset === p.key ? "var(--bg-deep)" : "var(--bg-surface)",
                  color: sizePreset === p.key ? "var(--ji-green)" : "var(--text-muted)",
                  cursor: "pointer", fontWeight: sizePreset === p.key ? 600 : 400,
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ fontWeight: 600 }}>{p.label}</div>
                <div style={{ fontSize: 10, opacity: 0.7 }}>{p.w}"×{p.h}" — {fmt(supplierCosts[p.key] ?? p.cost)}</div>
              </button>
            ))}
            <button
              onClick={() => setSizePreset("custom")}
              style={{
                padding: "6px 12px", borderRadius: "var(--radius-sm)", fontSize: 12,
                border: isCustom ? "1px solid var(--ji-green)" : "1px dashed var(--border-medium)",
                background: isCustom ? "var(--bg-deep)" : "transparent",
                color: isCustom ? "var(--ji-green)" : "var(--text-muted)",
                cursor: "pointer", fontWeight: isCustom ? 600 : 400,
              }}
            >
              Custom
            </button>
          </div>
        </div>

        {isCustom && (
          <div className="flex flex-wrap items-center gap-3 mb-3" style={{ fontSize: 12 }}>
            <label className="flex items-center gap-1.5">
              <span style={{ color: "var(--text-muted)" }}>W"</span>
              <input type="number" min={1} step={0.5} value={customW} onChange={(e) => setCustomW(Math.max(1, Number(e.target.value)))}
                className="field-editable" style={{ width: 56, padding: "3px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }} />
            </label>
            <span style={{ color: "var(--text-muted)" }}>×</span>
            <label className="flex items-center gap-1.5">
              <span style={{ color: "var(--text-muted)" }}>H"</span>
              <input type="number" min={1} step={0.5} value={customH} onChange={(e) => setCustomH(Math.max(1, Number(e.target.value)))}
                className="field-editable" style={{ width: 56, padding: "3px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }} />
            </label>
            <span className="tnum" style={{ color: "var(--text-secondary)" }}>
              = {(customW * customH).toFixed(1)} sq in → {fmt(transferCost)}/ea
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-5 mb-3">
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Quantity</label>
            <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
              className="field-editable" style={{ width: 100, padding: "7px 10px", textAlign: "center", fontSize: 14, fontWeight: 600 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Markup %</label>
            <input type="number" min={0} step={10} value={markup} onChange={(e) => setMarkup(Math.max(0, Number(e.target.value)))}
              className="field-editable" style={{ width: 80, padding: "7px 10px", textAlign: "center", fontSize: 14, fontWeight: 600 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Placements</label>
            <input type="number" min={1} max={5} value={numPlacements} onChange={(e) => setNumPlacements(Math.max(1, Math.min(5, Number(e.target.value))))}
              className="field-editable" style={{ width: 60, padding: "7px 10px", textAlign: "center", fontSize: 14, fontWeight: 600 }} />
          </div>
          <div style={{ width: 1, height: 32, background: "var(--border-subtle)", alignSelf: "flex-end" }} />
          {/* Garment presets */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Garment</label>
            <select
              className="rf-select"
              value=""
              onChange={(e) => {
                const val = Number(e.target.value);
                setGarmentCost(val);
                if (val > 0 && garmentMarkup === 0) setGarmentMarkup(40);
              }}
              style={{ padding: "7px 8px", fontSize: 12, minWidth: 130 }}
            >
              <option value="" disabled>Quick pick...</option>
              {GARMENT_PRESETS.map((g) => (
                <option key={g.label} value={g.cost}>{g.label}{g.cost > 0 ? ` (${fmt(g.cost)})` : ""}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-1.5 select-none" style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>$</span>
            <input type="number" min={0} step={0.01} value={garmentCost || ""} placeholder="0.00"
              onChange={(e) => setGarmentCost(Math.max(0, Number(e.target.value)))}
              className="field-editable" style={{ width: 70, padding: "3px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }} />
          </label>
          <label className="flex items-center gap-1.5 select-none" style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <span>Markup</span>
            <input type="number" min={0} step={1} value={garmentMarkup || ""} placeholder="0"
              onChange={(e) => setGarmentMarkup(Math.max(0, Number(e.target.value)))}
              className="field-editable" style={{ width: 50, padding: "3px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }} />
            <span>%</span>
          </label>
          {garmentCost > 0 && (
            <span className="tnum" style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
              = {fmt(garmentSell)}/ea
            </span>
          )}
        </div>

        {/* Markup Guide + Rush */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Markup:</span>
          {MARKUP_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setMarkup(p.pct)}
              style={{
                padding: "2px 8px", borderRadius: "var(--radius-sm)", fontSize: 11, cursor: "pointer",
                border: markup === p.pct ? "1px solid var(--ji-green)" : "1px solid var(--border-subtle)",
                background: markup === p.pct ? "rgba(52, 211, 153, 0.1)" : "transparent",
                color: markup === p.pct ? "var(--ji-green)" : "var(--text-muted)",
                fontWeight: markup === p.pct ? 600 : 400,
              }}
            >
              {p.label} ({p.pct}%)
            </button>
          ))}
          <span style={{ color: "var(--border-medium)" }}>|</span>
          <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Rush:</span>
          {[
            { label: "None", value: 0 },
            { label: "+25%", value: 25 },
            { label: "+50%", value: 50 },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRushPct(opt.value)}
              style={{
                padding: "2px 8px", borderRadius: "var(--radius-sm)", fontSize: 11, cursor: "pointer",
                border: rushPct === opt.value ? "1px solid var(--fund-amber)" : "1px solid var(--border-subtle)",
                background: rushPct === opt.value ? "rgba(251, 191, 36, 0.1)" : "transparent",
                color: rushPct === opt.value ? "var(--fund-amber)" : "var(--text-muted)",
                fontWeight: rushPct === opt.value ? 600 : 400,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Fees row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          <label className="flex items-center gap-1.5 select-none">
            <span style={{ fontWeight: 500 }}>Setup/Art $</span>
            <input type="number" min={0} step={5} value={setupArtFee}
              onChange={(e) => setSetupArtFee(Math.max(0, Number(e.target.value)))}
              className="field-editable" style={{ width: 60, padding: "3px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }} />
          </label>
          <label className="flex items-center gap-1.5 select-none">
            <span style={{ fontWeight: 500 }}>Shipping/unit $</span>
            <input type="number" min={0} step={0.05} value={shippingPerUnit}
              onChange={(e) => setShippingPerUnit(Math.max(0, Number(e.target.value)))}
              className="field-editable" style={{ width: 60, padding: "3px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }} />
          </label>
          <span style={{ color: "var(--border-medium)" }}>|</span>
          <label className="flex items-center gap-1.5 select-none">
            <span style={{ fontWeight: 500 }}>Customer Vol Discount</span>
            <input type="number" min={0} max={50} step={5} value={customerDiscountPct}
              onChange={(e) => setCustomerDiscountPct(Math.max(0, Math.min(50, Number(e.target.value))))}
              className="field-editable" style={{ width: 50, padding: "3px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }} />
            <span>%</span>
          </label>
        </div>

        {/* Small Order Fee */}
        {isSmallOrder && (
          <div className="alert-warn mt-3 p-2 flex items-center gap-3" style={{ fontSize: 12 }}>
            <label className="flex items-center gap-1.5 cursor-pointer select-none" style={{ fontWeight: 700 }}>
              <input type="checkbox" checked={enableSmallOrderFee} onChange={(e) => setEnableSmallOrderFee(e.target.checked)} className="rf-check" />
              Small Order Fee
            </label>
            {enableSmallOrderFee && (
              <>
                <span>$</span>
                <input type="number" min={0} step={5} value={smallOrderFee}
                  onChange={(e) => setSmallOrderFee(Math.max(0, Number(e.target.value)))}
                  className="field-editable" style={{ width: 60, padding: "2px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }} />
                <span style={{ color: "var(--text-muted)" }}>added to order (under {SMALL_ORDER_THRESHOLD} units)</span>
              </>
            )}
            {!enableSmallOrderFee && <span>Orders under {SMALL_ORDER_THRESHOLD} units — consider adding a surcharge</span>}
          </div>
        )}

        {/* QUOTE PRICE — prominent customer-facing number */}
        <div className="panel-inset panel-inset-green p-3 mt-4" style={{ textAlign: "center" }}>
          <div className="kpi-label mb-1">Quote This Price</div>
          <div className="kpi-value" style={{ color: "var(--ji-green)", fontSize: 36 }}>{fmt(quotePrice)}</div>
          <div className="tnum" style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
            per unit, all-in (transfer + garment + fees)
            {rushPct > 0 && <span style={{ color: "var(--fund-amber)" }}> +{rushPct}% rush</span>}
          </div>
        </div>

        {/* Results */}
        <div className="results-grid mt-4">
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
            <div className="kpi-label mb-1">Transfer Cost</div>
            <div className="tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--text-secondary)" }}>{fmt(pricing.totalTransferCost)}</div>
            <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {pricing.discountPct > 0 && <span style={{ color: "var(--ji-green)" }}>-{pricing.discountPct}% supplier </span>}
              {wastePct > 0 && <span>+{wastePct}% waste </span>}
              {numPlacements > 1 && <span>×{numPlacements} </span>}
              {shippingPerUnit > 0 && <span>+{fmt(shippingPerUnit)} ship</span>}
            </div>
          </div>

          <div className="text-right">
            <div className="kpi-label">Order Total</div>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: "var(--ji-green)" }}>{fmt(pricing.orderTotal)}</div>
            <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {qty} × {fmt(quotePrice)}
              {setupArtFee > 0 && <> + {fmt(setupArtFee)} setup</>}
              {effectiveSmallOrderFee > 0 && <> + {fmt(effectiveSmallOrderFee)} sm.order</>}
            </div>
          </div>

          <div className="text-right">
            <div className="kpi-label">Margin</div>
            <div className="tnum" style={{
              fontSize: 22, fontWeight: 700,
              color: pricing.marginPct >= 30 ? "var(--ji-green)" : pricing.marginPct >= 15 ? "var(--fund-amber)" : "var(--warn-red)",
            }}>
              {pricing.marginPct.toFixed(1)}%
            </div>
            <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {fmt(pricing.profitPerUnit)}/unit
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
              ~{time.totalMinutes.toFixed(0)}min ({pressCycleSec}s/pc)
            </div>
          </div>
        </div>

        <ProfitAlerts
          dollarsPerHour={dollarsPerHour}
          targetHourlyRate={targetHourlyRate}
          setTargetHourlyRate={setTargetHourlyRate}
          minProfitableQty={minProfitableQty}
          currentQty={qty}
          currentHourlyEarning={dollarsPerHour}
        />
      </div>

      {/* Gang Sheet Calculator */}
      <div className="panel p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="section-label">Gang Sheet Calculator</h2>
          <button
            onClick={() => setShowGangSheet(!showGangSheet)}
            className="btn" style={{ fontSize: 11, padding: "4px 12px" }}
          >
            {showGangSheet ? "Hide" : "Show"}
          </button>
        </div>
        {showGangSheet && (
          <div>
            <div className="flex flex-wrap items-end gap-4 mb-3">
              <div>
                <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Sheet Size</label>
                <div className="flex gap-2">
                  {GANG_SHEET_SIZES.map((gs, i) => (
                    <button
                      key={gs.label}
                      onClick={() => setGangSheetIdx(i)}
                      style={{
                        padding: "5px 10px", borderRadius: "var(--radius-sm)", fontSize: 12, cursor: "pointer",
                        border: gangSheetIdx === i ? "1px solid var(--client-blue)" : "1px solid var(--border-medium)",
                        background: gangSheetIdx === i ? "rgba(96, 165, 250, 0.1)" : "var(--bg-surface)",
                        color: gangSheetIdx === i ? "var(--client-blue)" : "var(--text-muted)",
                        fontWeight: gangSheetIdx === i ? 600 : 400,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>{gs.label}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{fmt(gs.cost)}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {gangSheetInfo && (
              <div className="panel-inset panel-inset-blue p-3">
                <div className="flex flex-wrap gap-6" style={{ fontSize: 13 }}>
                  <div>
                    <div className="kpi-label">Transfers per Sheet</div>
                    <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: "var(--client-blue)" }}>
                      {gangSheetInfo.fits}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {transferW}"×{transferH}" on {gangSheet.label}
                    </div>
                  </div>
                  <div>
                    <div className="kpi-label">Cost per Transfer</div>
                    <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: "var(--ji-green)" }}>
                      {gangSheetInfo.fits > 0 ? fmt(gangSheetInfo.costPerTransfer) : "N/A"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      vs {fmt(transferCost)} individual
                    </div>
                  </div>
                  <div>
                    <div className="kpi-label">Savings</div>
                    <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: gangSheetInfo.costPerTransfer < transferCost ? "var(--ji-green)" : "var(--warn-red)" }}>
                      {gangSheetInfo.fits > 0 && transferCost > 0
                        ? `${(((transferCost - gangSheetInfo.costPerTransfer) / transferCost) * 100).toFixed(0)}%`
                        : "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      vs individual pricing
                    </div>
                  </div>
                  <div>
                    <div className="kpi-label">Sheet Waste</div>
                    <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: gangSheetInfo.wastePercent > 25 ? "var(--fund-amber)" : "var(--text-secondary)" }}>
                      {gangSheetInfo.wastePercent.toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      unused area
                    </div>
                  </div>
                  {qty > 0 && gangSheetInfo.fits > 0 && (
                    <div>
                      <div className="kpi-label">Sheets Needed</div>
                      <div className="tnum" style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                        {Math.ceil((qty * numPlacements) / gangSheetInfo.fits)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        for {qty} units{numPlacements > 1 && ` × ${numPlacements} placements`}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
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
          <div className="flex items-center justify-between px-3 pt-3">
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Sell price per unit{rateCardIncludeGarment && garmentCost > 0 ? ` (incl. garment ${fmt(garmentSell)})` : ""}
              {setupArtFee > 0 && " + setup fee"}
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer select-none" style={{ fontSize: 11, color: "var(--text-muted)" }}>
              <input type="checkbox" checked={rateCardIncludeGarment} onChange={(e) => setRateCardIncludeGarment(e.target.checked)} className="rf-check" />
              Include garment
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="rf-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", paddingLeft: 12 }}>Size</th>
                  {DTF_QTY_TIERS.map((t, qi) => (
                    <th key={t.label} style={{
                      textAlign: "center",
                      color: qi === activeQtyCol ? "var(--ji-green)" : undefined,
                      background: qi === activeQtyCol ? "rgba(52, 211, 153, 0.08)" : undefined,
                    }}>{t.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rateCard.map((row, si) => {
                  const preset = DTF_SIZE_PRESETS[si];
                  const isActiveRow = si === activePresetRow;
                  return (
                    <tr key={si} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ paddingLeft: 12, fontWeight: 600, fontSize: 12, color: isActiveRow ? "var(--ji-green)" : "var(--text-secondary)" }}>
                        {preset.label}
                        <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 6 }}>{preset.w}"×{preset.h}"</span>
                      </td>
                      {row.map((price, qi) => {
                        const isHighlighted = isActiveRow && qi === activeQtyCol;
                        const isColHighlight = qi === activeQtyCol;
                        return (
                          <td
                            key={qi}
                            onClick={() => { setSizePreset(preset.key); setQty(DTF_QTY_TIERS[qi].rep); }}
                            style={{
                              textAlign: "center", padding: "8px 6px", cursor: "pointer",
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
            </table>
          </div>
        </div>
      )}

      {/* Parameters */}
      {activeTab === "params" && (
        <div className="panel p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="section-label">DTF Parameters</h2>
            <button
              onClick={() => {
                const costs = {};
                DTF_SIZE_PRESETS.forEach((p) => { costs[p.key] = p.cost; });
                setSupplierCosts(costs);
                setCostPerSqIn(DEFAULT_COST_PER_SQ_IN);
                setQtyDiscounts(DEFAULT_QTY_DISCOUNTS.map((d) => ({ ...d })));
                setPressCycleSec(DEFAULT_PRESS_CYCLE_SEC);
                setMarkup(DEFAULT_DTF_MARKUP);
                setSetupMinutes(DEFAULT_DTF_SETUP_MIN);
                setShippingPerUnit(DEFAULT_SUPPLIER_SHIPPING);
                setSetupArtFee(DEFAULT_SETUP_ART_FEE);
                setWastePct(DEFAULT_WASTE_PCT);
                setSmallOrderFee(DEFAULT_SMALL_ORDER_FEE);
              }}
              className="btn" style={{ fontSize: 12, padding: "5px 14px" }}
            >
              Reset to Default
            </button>
          </div>

          {/* Supplier Costs */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Supplier Costs Per Transfer (flat rate)
            </div>
            <div className="flex flex-wrap gap-3">
              {DTF_SIZE_PRESETS.map((p) => (
                <div key={p.key}>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>
                    {p.label} ({p.w}"×{p.h}")
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--text-muted)", pointerEvents: "none" }}>$</span>
                    <input
                      type="number" min={0} step={0.25} value={supplierCosts[p.key] ?? p.cost}
                      onChange={(e) => setSupplierCosts((prev) => ({ ...prev, [p.key]: Math.max(0, Number(e.target.value)) }))}
                      className="field-editable tnum"
                      style={{ width: 80, padding: "5px 6px 5px 18px", textAlign: "center", fontSize: 12, fontWeight: 600 }}
                    />
                  </div>
                </div>
              ))}
              <div>
                <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>Custom $/sq in</label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--text-muted)", pointerEvents: "none" }}>$</span>
                  <input
                    type="number" min={0} step={0.005} value={costPerSqIn}
                    onChange={(e) => setCostPerSqIn(Math.max(0, Number(e.target.value)))}
                    className="field-editable tnum"
                    style={{ width: 80, padding: "5px 6px 5px 18px", textAlign: "center", fontSize: 12, fontWeight: 600 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Volume Discounts */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Supplier Volume Discounts
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>
              Reduces your cost from the supplier at higher quantities
            </div>
            <div className="flex flex-wrap gap-3">
              {qtyDiscounts.map((d, i) => (
                <div key={i} className="panel-inset p-2 flex items-center gap-2">
                  <input type="number" min={1} value={d.minQty} onChange={(e) => updateDiscount(i, "minQty", e.target.value)}
                    className="field-editable tnum" style={{ width: 56, padding: "3px 4px", textAlign: "center", fontSize: 12, fontWeight: 600 }} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>+ →</span>
                  <input type="number" min={0} max={100} value={d.discountPct} onChange={(e) => updateDiscount(i, "discountPct", e.target.value)}
                    className="field-editable tnum" style={{ width: 48, padding: "3px 4px", textAlign: "center", fontSize: 12, fontWeight: 600 }} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Press & Job Settings */}
          <div className="flex flex-wrap gap-5">
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>Full Cycle (sec)</label>
              <input type="number" min={1} step={5} value={pressCycleSec} onChange={(e) => setPressCycleSec(Math.max(1, Number(e.target.value)))}
                className="field-editable" style={{ width: 70, padding: "5px 8px", textAlign: "center", fontSize: 13, fontWeight: 600 }} />
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>load+press+peel</div>
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>Setup (min)</label>
              <input type="number" min={0} step={1} value={setupMinutes} onChange={(e) => setSetupMinutes(Math.max(0, Number(e.target.value)))}
                className="field-editable" style={{ width: 70, padding: "5px 8px", textAlign: "center", fontSize: 13, fontWeight: 600 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>Default Markup %</label>
              <input type="number" min={0} step={10} value={markup} onChange={(e) => setMarkup(Math.max(0, Number(e.target.value)))}
                className="field-editable" style={{ width: 70, padding: "5px 8px", textAlign: "center", fontSize: 13, fontWeight: 600 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>Waste/Misprints %</label>
              <input type="number" min={0} max={20} step={1} value={wastePct} onChange={(e) => setWastePct(Math.max(0, Number(e.target.value)))}
                className="field-editable" style={{ width: 70, padding: "5px 8px", textAlign: "center", fontSize: 13, fontWeight: 600 }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>Small Order Fee</label>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 6, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "var(--text-muted)", pointerEvents: "none" }}>$</span>
                <input type="number" min={0} step={5} value={smallOrderFee} onChange={(e) => setSmallOrderFee(Math.max(0, Number(e.target.value)))}
                  className="field-editable" style={{ width: 70, padding: "5px 8px 5px 18px", textAlign: "center", fontSize: 13, fontWeight: 600 }} />
              </div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>&lt;{SMALL_ORDER_THRESHOLD} units</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
