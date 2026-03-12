import { useState, useMemo } from "react";
import {
  DTF_SIZE_PRESETS, DEFAULT_COST_PER_SQ_IN, DEFAULT_DTF_MARKUP,
  DEFAULT_PRESS_TIME_SEC, DEFAULT_DTF_SETUP_MIN, DEFAULT_QTY_DISCOUNTS,
  DTF_QTY_TIERS, calcDTFPrice, calcDTFTime, buildDTFRateCard,
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
  const [pressTimeSec, setPressTimeSec] = useState(DEFAULT_PRESS_TIME_SEC);
  const [setupMinutes, setSetupMinutes] = useState(DEFAULT_DTF_SETUP_MIN);
  const [garmentCost, setGarmentCost] = useState(0);
  const [garmentMarkup, setGarmentMarkup] = useState(0);
  const [activeTab, setActiveTab] = useState("card");
  const [targetHourlyRate, setTargetHourlyRate] = useState(75);

  const isCustom = sizePreset === "custom";
  const currentPreset = DTF_SIZE_PRESETS.find((p) => p.key === sizePreset);

  const transferCost = useMemo(() => {
    if (isCustom) return customW * customH * costPerSqIn;
    return supplierCosts[sizePreset] ?? currentPreset?.cost ?? 3.50;
  }, [isCustom, customW, customH, costPerSqIn, sizePreset, supplierCosts, currentPreset]);

  const pricing = useMemo(() => {
    return calcDTFPrice(transferCost, qty, markup, garmentCost, garmentMarkup, qtyDiscounts);
  }, [transferCost, qty, markup, garmentCost, garmentMarkup, qtyDiscounts]);

  const time = useMemo(() => calcDTFTime(qty, pressTimeSec, setupMinutes), [qty, pressTimeSec, setupMinutes]);

  const totalProfit = pricing.profitPerUnit * qty;
  const dollarsPerHour = time.totalHours > 0 ? totalProfit / time.totalHours : 0;

  const jobScore = useMemo(() => {
    return calcJobScore(pricing.marginPct, dollarsPerHour, totalProfit, 1.0, targetHourlyRate);
  }, [pricing.marginPct, dollarsPerHour, totalProfit, targetHourlyRate]);

  const shopRates = useMemo(() => calcShopRates(shopEconomics), [shopEconomics]);

  const rateCard = useMemo(() => {
    return buildDTFRateCard(supplierCosts, markup, qtyDiscounts);
  }, [supplierCosts, markup, qtyDiscounts]);

  // Find active qty col for highlighting
  const activeQtyCol = useMemo(() => {
    for (let i = DTF_QTY_TIERS.length - 1; i >= 0; i--) {
      if (qty >= DTF_QTY_TIERS[i].min) return i;
    }
    return -1;
  }, [qty]);

  const activePresetRow = DTF_SIZE_PRESETS.findIndex((p) => p.key === sizePreset);

  // Min profitable qty
  const minProfitableQty = useMemo(() => {
    for (let q = 1; q <= 1000; q++) {
      const p = calcDTFPrice(transferCost, q, markup, garmentCost, garmentMarkup, qtyDiscounts);
      const t = calcDTFTime(q, pressTimeSec, setupMinutes);
      const profit = p.profitPerUnit * q;
      if (t.totalHours > 0 && profit / t.totalHours >= targetHourlyRate) return q;
    }
    return null;
  }, [transferCost, markup, garmentCost, garmentMarkup, qtyDiscounts, pressTimeSec, setupMinutes, targetHourlyRate]);

  const updateDiscount = (idx, field, value) => {
    setQtyDiscounts((prev) => {
      const next = prev.map((d) => ({ ...d }));
      next[idx][field] = Number(value) || 0;
      return next;
    });
  };

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
          <div style={{ width: 1, height: 32, background: "var(--border-subtle)", alignSelf: "flex-end" }} />
          <label className="flex items-center gap-1.5 select-none" style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>Garment $</span>
            <input type="number" min={0} step={0.01} value={garmentCost || ""} placeholder="0.00"
              onChange={(e) => setGarmentCost(Math.max(0, Number(e.target.value)))}
              className="field-editable" style={{ width: 80, padding: "3px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }} />
          </label>
          <label className="flex items-center gap-1.5 select-none" style={{ fontSize: 12, color: "var(--text-muted)" }}>
            <span>Markup</span>
            <input type="number" min={0} step={1} value={garmentMarkup || ""} placeholder="0"
              onChange={(e) => setGarmentMarkup(Math.max(0, Number(e.target.value)))}
              className="field-editable" style={{ width: 56, padding: "3px 6px", textAlign: "center", fontSize: 12, fontWeight: 600 }} />
            <span>%</span>
          </label>
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
            <div className="kpi-label mb-1">Per Transfer Cost</div>
            <div className="tnum" style={{ fontSize: 18, fontWeight: 600, color: "var(--text-secondary)" }}>{fmt(pricing.discountedCost)}</div>
            {pricing.discountPct > 0 && (
              <div className="tnum" style={{ fontSize: 11, color: "var(--ji-green)", marginTop: 2 }}>
                {pricing.discountPct}% vol discount
              </div>
            )}
          </div>

          <div className="panel-inset p-3 text-right">
            <div className="kpi-label mb-1">Per Unit Sell</div>
            <div className="kpi-value" style={{ color: "var(--ji-green)" }}>{fmt(pricing.sellPerUnit)}</div>
            <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              {fmt(pricing.sellPerTransfer)} transfer
              {pricing.garmentSell > 0 && <> + {fmt(pricing.garmentSell)} garment</>}
            </div>
          </div>

          <div className="text-right">
            <div className="kpi-label">Order Total</div>
            <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: "var(--ji-green)" }}>{fmt(pricing.orderTotal)}</div>
            <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{qty} units</div>
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
              {fmt(pricing.profitPerUnit)}/unit profit
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
              ~{time.totalMinutes.toFixed(0)}min
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
                setPressTimeSec(DEFAULT_PRESS_TIME_SEC);
                setMarkup(DEFAULT_DTF_MARKUP);
              }}
              className="btn" style={{ fontSize: 12, padding: "5px 14px" }}
            >
              Reset to Default
            </button>
          </div>

          {/* Supplier Costs */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Supplier Costs Per Transfer
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

          {/* Qty Discounts */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Volume Discounts
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

          {/* Press Settings */}
          <div className="flex flex-wrap gap-5">
            <div>
              <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>Press Time (sec)</label>
              <input type="number" min={1} step={1} value={pressTimeSec} onChange={(e) => setPressTimeSec(Math.max(1, Number(e.target.value)))}
                className="field-editable" style={{ width: 70, padding: "5px 8px", textAlign: "center", fontSize: 13, fontWeight: 600 }} />
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
          </div>
        </div>
      )}
    </>
  );
}
