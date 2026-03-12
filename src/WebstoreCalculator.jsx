import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { DECO_TYPES, LOCATIONS, estimateDecoCogs, getDecoParamOptions, getDefaultDecoParam, decoCogsTooltip, locationToDtfPreset, decoSummaryLabel, DECO_TYPE_COLORS } from "./decoCostEstimator";
import DecoPopover from "./DecoPopover";

const DEFAULT_SETTINGS = {
  jiFeePct: 15,
  jiMinPerUnit: 2.0,
  apparelMarkupPct: 10,
  clientFeePct: 12,
  clientMinPerUnit: 2.5,
  fundraiserPct: 8,
  fundraiserMin: 3.0,
  decoMarginPct: 30,
  clientName: "Fairview Equestrian",
  contractClient: "Jeff",
};

const DEFAULT_ITEMS = [
  { id: 1, product: "Womens Fitted Tee", location: "Front", decoType: "custom", decoParam: null, decoCogs: 5.38, apparelCost: 3.39, qty: 5 },
  { id: 2, product: "Youth Crewneck Sweatshirt", location: "Front", decoType: "custom", decoParam: null, decoCogs: 5.38, apparelCost: 6.92, qty: 0 },
  { id: 3, product: "Youth Hooded Sweatshirt", location: "Front", decoType: "custom", decoParam: null, decoCogs: 5.38, apparelCost: 11.10, qty: 4 },
  { id: 4, product: "Womens Tank Top", location: "Front", decoType: "custom", decoParam: null, decoCogs: 5.38, apparelCost: 3.61, qty: 1 },
  { id: 5, product: "Carhartt Hoodie", location: "Front", decoType: "custom", decoParam: null, decoCogs: 5.38, apparelCost: 45.64, qty: 4 },
  { id: 6, product: "Women's Fleece Jacket", location: "Back", decoType: "custom", decoParam: null, decoCogs: 5.38, apparelCost: 24.83, qty: 0 },
  { id: 7, product: "Carhartt Mock Zip Hoodie", location: "Back", decoType: "custom", decoParam: null, decoCogs: 5.38, apparelCost: 49.44, qty: 0 },
  { id: 8, product: "Men's/Womens Jacket", location: "Front Left Chest", decoType: "custom", decoParam: null, decoCogs: 7.63, apparelCost: 22.35, qty: 5 },
  { id: 9, product: "Womens Leggings", location: "Front Hip", decoType: "custom", decoParam: null, decoCogs: 2.80, apparelCost: 18.23, qty: 1 },
  { id: 10, product: "Youth Joggers", location: "Front Hip", decoType: "custom", decoParam: null, decoCogs: 2.80, apparelCost: 10.79, qty: 2 },
  { id: 11, product: "Mesh Cap", location: "Front", decoType: "custom", decoParam: null, decoCogs: 4.76, apparelCost: 9.23, qty: 0 },
  { id: 12, product: "Beanie", location: "Front", decoType: "custom", decoParam: null, decoCogs: 4.76, apparelCost: 15.21, qty: 0 },
  { id: 13, product: "Visor", location: "Front", decoType: "custom", decoParam: null, decoCogs: 4.76, apparelCost: 5.02, qty: 1 },
  { id: 14, product: "Headband", location: "Front", decoType: "custom", decoParam: null, decoCogs: 4.76, apparelCost: 2.49, qty: 2 },
];

const fmt = (v) => "$" + v.toFixed(2);
const fmtPct = (v) => v.toFixed(1) + "%";

function calcItem(item, s) {
  const jiPct = s.jiFeePct / 100;
  const jiMin = s.jiMinPerUnit;
  const mkupPct = s.apparelMarkupPct / 100;
  const clientPct = s.clientFeePct / 100;
  const clientMin = s.clientMinPerUnit;
  const fundPct = s.fundraiserPct / 100;
  const fundMin = s.fundraiserMin;
  const decoMgn = s.decoMarginPct / 100;

  const decoPrice = item.decoCogs * (1 + decoMgn);
  const decoProfit = decoPrice - item.decoCogs;
  const apparelMarkup = item.apparelCost * mkupPct;
  const hardCosts = decoPrice + item.apparelCost + apparelMarkup;

  const baseDenom = 1 - jiPct - clientPct - fundPct;
  let retail = baseDenom > 0 ? hardCosts / baseDenom : hardCosts * 10;

  for (let i = 0; i < 5; i++) {
    const jiIsMin = jiMin > retail * jiPct;
    const clientIsMin = clientMin > retail * clientPct;
    const fundIsMin = fundMin > retail * fundPct;

    let pctDenom = 1;
    let fixedCosts = hardCosts;
    if (jiIsMin) { fixedCosts += jiMin; } else { pctDenom -= jiPct; }
    if (clientIsMin) { fixedCosts += clientMin; } else { pctDenom -= clientPct; }
    if (fundIsMin) { fixedCosts += fundMin; } else { pctDenom -= fundPct; }

    const newRetail = pctDenom > 0 ? fixedCosts / pctDenom : fixedCosts * 10;
    if (Math.abs(newRetail - retail) < 0.005) break;
    retail = newRetail;
  }

  const roundedRetail = Math.ceil(retail);

  const jiFeeAmt = Math.max(roundedRetail * jiPct, jiMin);
  const jiMinApplied = jiMin > roundedRetail * jiPct;
  const clientFeeAmt = Math.max(roundedRetail * clientPct, clientMin);
  const clientMinApplied = clientMin > roundedRetail * clientPct;
  const fundAmt = Math.max(roundedRetail * fundPct, fundMin);
  const fundMinApplied = fundMin > roundedRetail * fundPct;

  const jiTotalPerUnit = jiFeeAmt + apparelMarkup + decoProfit;
  const marginPct = roundedRetail > 0 ? (jiTotalPerUnit / roundedRetail) * 100 : 0;

  const revenue = roundedRetail * item.qty;
  const fundPayout = fundAmt * item.qty;
  const clientFeeTotal = clientFeeAmt * item.qty;
  const apparelTotal = (item.apparelCost + apparelMarkup) * item.qty;
  const decoCogTotal = item.decoCogs * item.qty;
  const decoProfitTotal = decoProfit * item.qty;
  const apparelMarkupTotal = apparelMarkup * item.qty;
  const jiGross = jiTotalPerUnit * item.qty;

  return {
    decoPrice, decoProfit, apparelMarkup, hardCosts, roundedRetail,
    jiFeeAmt, jiMinApplied, clientFeeAmt, clientMinApplied, fundAmt, fundMinApplied,
    jiTotalPerUnit, marginPct, revenue, fundPayout, clientFeeTotal, apparelTotal,
    decoCogTotal, decoProfitTotal, apparelMarkupTotal, jiGross,
  };
}

function SettingInput({ label, value, onChange, step, unit, accentColor }) {
  return (
    <div className="flex items-center justify-between">
      <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          step={step}
          min={0}
          className="field-editable"
          style={{
            width: 72,
            padding: "4px 6px",
            textAlign: "right",
            fontSize: 13,
            fontWeight: 600,
            borderLeftColor: accentColor || "var(--ji-green)",
          }}
        />
        <span style={{ fontSize: 11, color: "var(--text-muted)", width: 14 }}>{unit}</span>
      </div>
    </div>
  );
}

function marginColor(pct) {
  if (pct > 25) return "var(--ji-green)";
  if (pct > 15) return "var(--fund-amber)";
  return "var(--warn-red)";
}

function rowHealthClass(marginPct, qty) {
  if (qty === 0) return "row-neutral";
  if (marginPct > 25) return "row-healthy";
  if (marginPct > 15) return "row-warning";
  return "row-danger";
}

export default function WebstoreCalculator() {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const [items, setItems] = useState(DEFAULT_ITEMS.map((i) => ({ ...i })));
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [viewMode, setViewMode] = useState("internal"); // internal | client
  const nextId = useRef(100);
  const kpiRef = useRef(null);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const updateSetting = useCallback((key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
  }, []);

  const updateItem = useCallback((id, field, value) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  }, []);

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { id: ++nextId.current, product: "", location: "Front", decoType: "sp", decoParam: 2, decoCogs: 0, apparelCost: 0, qty: 0 }]);
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const duplicateItem = useCallback((id) => {
    setItems((prev) => {
      const source = prev.find((item) => item.id === id);
      if (!source) return prev;
      const idx = prev.findIndex((item) => item.id === id);
      const newItem = { ...source, id: ++nextId.current, qty: 0, decoType: source.decoType || "custom", decoParam: source.decoParam ?? null };
      const next = [...prev];
      next.splice(idx + 1, 0, newItem);
      return next;
    });
  }, []);

  const updateDecoType = useCallback((id, newType) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      return { ...item, decoType: newType, decoParam: getDefaultDecoParam(newType, item.location) };
    }));
  }, []);

  const updateDecoParam = useCallback((id, newParam) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, decoParam: newParam } : item));
  }, []);

  const updateLocation = useCallback((id, newLocation) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, location: newLocation };
      if (item.decoType === "dtf") updated.decoParam = locationToDtfPreset(newLocation);
      return updated;
    }));
  }, []);

  // Bulk deco setter state
  const [bulkDecoType, setBulkDecoType] = useState("sp");
  const [bulkDecoParam, setBulkDecoParam] = useState(2);

  const applyBulkDeco = useCallback(() => {
    setItems((prev) => prev.map((item) => ({
      ...item,
      decoType: bulkDecoType,
      decoParam: bulkDecoType === "dtf" ? locationToDtfPreset(item.location) : bulkDecoParam,
    })));
  }, [bulkDecoType, bulkDecoParam]);

  // Popover state — which item's deco dropdown is open
  const [openDecoId, setOpenDecoId] = useState(null);
  const popoverRef = useRef(null);

  // Location dropdown state
  const [openLocId, setOpenLocId] = useState(null);
  const locRef = useRef(null);

  // Click-outside to dismiss popovers
  useEffect(() => {
    if (!openDecoId && !openLocId) return;
    const handler = (e) => {
      if (openDecoId && popoverRef.current && !popoverRef.current.contains(e.target)) {
        setOpenDecoId(null);
      }
      if (openLocId && locRef.current && !locRef.current.contains(e.target)) {
        setOpenLocId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openDecoId, openLocId]);

  const totalQty = useMemo(() => items.reduce((s, i) => s + i.qty, 0), [items]);

  const calculated = useMemo(() => {
    return items.map((item) => {
      const effectiveCogs = item.decoType === "custom" || !item.decoType
        ? item.decoCogs
        : estimateDecoCogs(item.decoType, item.decoParam, item.qty, totalQty) ?? item.decoCogs;
      const cogsTooltip = decoCogsTooltip(item.decoType, item.decoParam, item.qty, totalQty, effectiveCogs);
      return { item, calc: calcItem({ ...item, decoCogs: effectiveCogs }, settings), effectiveCogs, cogsTooltip };
    });
  }, [items, settings]);

  const totals = useMemo(() => {
    const t = { qty: 0, revenue: 0, fundPayout: 0, clientFeeTotal: 0, apparelTotal: 0, decoCogTotal: 0, decoProfitTotal: 0, apparelMarkupTotal: 0, jiGross: 0, rawApparelCost: 0 };
    calculated.forEach(({ item, calc }) => {
      t.qty += item.qty;
      t.revenue += calc.revenue;
      t.fundPayout += calc.fundPayout;
      t.clientFeeTotal += calc.clientFeeTotal;
      t.apparelTotal += calc.apparelTotal;
      t.decoCogTotal += calc.decoCogTotal;
      t.decoProfitTotal += calc.decoProfitTotal;
      t.apparelMarkupTotal += calc.apparelMarkupTotal;
      t.jiGross += calc.jiGross;
      t.rawApparelCost += item.apparelCost * item.qty;
    });
    t.jiFeeRevenue = t.jiGross - t.decoProfitTotal - t.apparelMarkupTotal;
    t.totalPayouts = t.fundPayout + t.clientFeeTotal + t.apparelTotal + t.decoCogTotal;
    t.grossMargin = t.revenue > 0 ? (t.jiGross / t.revenue) * 100 : 0;
    t.avgProfitPerUnit = t.qty > 0 ? t.jiGross / t.qty : 0;
    return t;
  }, [calculated]);

  // Quote intelligence
  const insights = useMemo(() => {
    const warnings = [];
    const activeItems = calculated.filter(({ item }) => item.qty > 0);

    const lowMarginItems = activeItems.filter(({ calc }) => calc.marginPct < 20 && calc.marginPct > 0);
    if (lowMarginItems.length > 0) {
      warnings.push({ type: "warn", text: `${lowMarginItems.length} item${lowMarginItems.length > 1 ? "s" : ""} below 20% margin` });
    }

    const negativeItems = activeItems.filter(({ calc }) => calc.jiGross < 0);
    negativeItems.forEach(({ item, calc }) => {
      warnings.push({ type: "danger", text: `${item.product} generating ${fmt(calc.jiTotalPerUnit)}/unit loss` });
    });

    if (activeItems.length > 0) {
      const best = activeItems.reduce((a, b) => a.calc.jiTotalPerUnit > b.calc.jiTotalPerUnit ? a : b);
      const worst = activeItems.reduce((a, b) => a.calc.jiTotalPerUnit < b.calc.jiTotalPerUnit ? a : b);
      if (best.item.id !== worst.item.id) {
        warnings.push({ type: "info", text: `Best: ${best.item.product} (${fmt(best.calc.jiTotalPerUnit)}/unit) | Worst: ${worst.item.product} (${fmt(worst.calc.jiTotalPerUnit)}/unit)` });
      }
    }

    const payoutPct = settings.fundraiserPct + settings.clientFeePct;
    if (payoutPct > 40) {
      warnings.push({ type: "warn", text: `Payout allocation at ${fmtPct(payoutPct)} — consider rebalancing` });
    }

    return warnings;
  }, [calculated, settings]);

  // Sticky performance bar via IntersectionObserver
  useEffect(() => {
    const el = kpiRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // CSV export
  const exportCSV = useCallback(() => {
    const isClient = viewMode === "client";
    let headers, rows;

    if (isClient) {
      headers = ["Product", "Location", "Retail Price", "Qty", "Subtotal"];
      rows = calculated.filter(({ item }) => item.qty > 0).map(({ item, calc }) => [
        item.product, item.location, calc.roundedRetail.toFixed(2), item.qty, calc.revenue.toFixed(2),
      ]);
      rows.push(["", "", "", totals.qty, totals.revenue.toFixed(2)]);
    } else {
      headers = ["Product", "Location", "Deco Type", "Deco COGS", "Deco Price", "Apparel $", "Retail", "Fund $/u", "Client $/u", "JI $/u", "Qty", "Revenue", "JI Profit"];
      rows = calculated.map(({ item, calc, effectiveCogs }) => [
        item.product, item.location, (item.decoType || "custom").toUpperCase(), (effectiveCogs ?? item.decoCogs).toFixed(2), calc.decoPrice.toFixed(2),
        item.apparelCost.toFixed(2), calc.roundedRetail.toFixed(2), calc.fundAmt.toFixed(2),
        calc.clientFeeAmt.toFixed(2), calc.jiTotalPerUnit.toFixed(2), item.qty,
        calc.revenue.toFixed(2), calc.jiGross.toFixed(2),
      ]);
      rows.push(["", "", "", "", "", "", "", "", "TOTALS", totals.qty, totals.revenue.toFixed(2), totals.jiGross.toFixed(2)]);
    }

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${settings.clientName.replace(/\s+/g, "-")}-quote-${viewMode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [calculated, totals, settings.clientName, viewMode]);

  const duplicateQuote = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, qty: 0 })));
  }, []);

  const allocationPct = settings.jiFeePct + settings.clientFeePct + settings.fundraiserPct;
  const overAllocated = allocationPct >= 100;
  const isClient = viewMode === "client";

  return (
    <>
      {/* KPI Strip */}
      <div ref={kpiRef} className="panel p-3 mb-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Store info */}
          <div className="flex gap-3 items-center">
            <input
              value={settings.clientName}
              onChange={(e) => updateSetting("clientName", e.target.value)}
              className="field-editable"
              style={{ padding: "4px 10px", fontSize: 14, fontWeight: 600, width: 200 }}
            />
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>/</span>
            <input
              value={settings.contractClient}
              onChange={(e) => updateSetting("contractClient", e.target.value)}
              className="field-editable"
              style={{ padding: "4px 10px", fontSize: 13, fontWeight: 500, width: 120 }}
            />
          </div>

          {/* KPI metrics */}
          <div className="flex gap-6 items-center flex-wrap">
            <div className="text-center">
              <div className="kpi-label">Revenue</div>
              <div className="kpi-value" style={{ color: "var(--text-primary)", fontSize: 24 }}>{fmt(totals.revenue)}</div>
            </div>
            <div className="text-center">
              <div className="kpi-label">Profit</div>
              <div className="kpi-value" style={{ color: "var(--ji-green)", fontSize: 24 }}>{fmt(totals.jiGross)}</div>
            </div>
            <div className="text-center">
              <div className="kpi-label">Margin</div>
              <div className="kpi-value" style={{ color: marginColor(totals.grossMargin), fontSize: 24 }}>{fmtPct(totals.grossMargin)}</div>
            </div>
            <div className="text-center">
              <div className="kpi-label">Units</div>
              <div className="kpi-value" style={{ color: "var(--text-secondary)", fontSize: 24 }}>{totals.qty}</div>
            </div>
            <div className="text-center">
              <div className="kpi-label">Avg $/Unit</div>
              <div className="kpi-value" style={{ color: "var(--text-secondary)", fontSize: 24 }}>{fmt(totals.avgProfitPerUnit)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <button onClick={addItem} className="btn-primary" style={{ padding: "5px 14px", fontSize: 12 }}>+ Add Item</button>
        <button onClick={duplicateQuote} className="btn" style={{ padding: "5px 14px", fontSize: 12 }}>Duplicate Quote</button>
        <button onClick={exportCSV} className="btn" style={{ padding: "5px 14px", fontSize: 12 }}>Export CSV</button>
        <label className="flex items-center gap-1.5 cursor-pointer select-none" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          <input type="checkbox" checked={showBreakdown} onChange={(e) => setShowBreakdown(e.target.checked)} className="rf-check" />
          Full Breakdown
        </label>
        {!isClient && (
          <div className="flex items-center gap-1.5" style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8, padding: "3px 8px", background: "var(--bg-deep)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
            <span style={{ fontWeight: 500 }}>Set all:</span>
            <select
              value={bulkDecoType}
              onChange={(e) => { setBulkDecoType(e.target.value); setBulkDecoParam(getDefaultDecoParam(e.target.value)); }}
              className="rf-select"
              style={{ padding: "1px 2px", fontSize: 11 }}
            >
              {DECO_TYPES.filter((dt) => dt.key !== "custom").map((dt) => (
                <option key={dt.key} value={dt.key}>{dt.label}</option>
              ))}
            </select>
            {bulkDecoType !== "dtf" && (
              <select
                value={bulkDecoParam ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setBulkDecoParam(bulkDecoType === "emb" || bulkDecoType === "sp" ? Number(v) : v);
                }}
                className="rf-select"
                style={{ padding: "1px 2px", fontSize: 11 }}
              >
                {getDecoParamOptions(bulkDecoType).map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            <button onClick={applyBulkDeco} className="btn-primary" style={{ padding: "2px 8px", fontSize: 11 }}>Apply</button>
          </div>
        )}
        <div className="flex-1" />
        {/* View mode toggle */}
        <div className="flex" style={{ background: "var(--bg-deep)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", padding: 2 }}>
          {[
            { id: "internal", label: "Internal" },
            { id: "client", label: "Client View" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => setViewMode(m.id)}
              style={{
                padding: "4px 12px",
                borderRadius: "var(--radius-sm)",
                fontSize: 11,
                fontWeight: viewMode === m.id ? 600 : 400,
                background: viewMode === m.id ? "var(--bg-surface)" : "transparent",
                color: viewMode === m.id ? "var(--ji-green)" : "var(--text-muted)",
                border: viewMode === m.id ? "1px solid var(--border-medium)" : "1px solid transparent",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2-Panel Layout */}
      {!isClient && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          {/* Left: Pricing Controls */}
          <div className="lg:col-span-3 space-y-4">
            <div className="panel p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* JI Settings */}
                <div>
                  <h3 className="section-label mb-2 flex items-center gap-2">
                    <span style={{ width: 8, height: 8, borderRadius: "var(--radius-sm)", background: "var(--ji-green)", display: "inline-block" }} /> Jersey Ink
                  </h3>
                  <div className="panel-inset p-3 space-y-2">
                    <SettingInput label="JI Fee %" value={settings.jiFeePct} onChange={(v) => updateSetting("jiFeePct", v)} step={0.5} unit="%" accentColor="var(--ji-green)" />
                    <SettingInput label="JI Min $/Unit" value={settings.jiMinPerUnit} onChange={(v) => updateSetting("jiMinPerUnit", v)} step={0.25} unit="$" accentColor="var(--ji-green)" />
                    <SettingInput label="Apparel Markup" value={settings.apparelMarkupPct} onChange={(v) => updateSetting("apparelMarkupPct", v)} step={0.5} unit="%" accentColor="var(--ji-green)" />
                    <SettingInput label="Deco Margin" value={settings.decoMarginPct} onChange={(v) => updateSetting("decoMarginPct", v)} step={1} unit="%" accentColor="var(--ji-green)" />
                  </div>
                </div>

                {/* Client Settings */}
                <div>
                  <h3 className="section-label mb-2 flex items-center gap-2">
                    <span style={{ width: 8, height: 8, borderRadius: "var(--radius-sm)", background: "var(--client-blue)", display: "inline-block" }} /> Client ({settings.contractClient})
                  </h3>
                  <div className="panel-inset p-3 space-y-2">
                    <SettingInput label="Client Fee %" value={settings.clientFeePct} onChange={(v) => updateSetting("clientFeePct", v)} step={0.5} unit="%" accentColor="var(--client-blue)" />
                    <SettingInput label="Client Min $/u" value={settings.clientMinPerUnit} onChange={(v) => updateSetting("clientMinPerUnit", v)} step={0.25} unit="$" accentColor="var(--client-blue)" />
                  </div>
                </div>

                {/* Fundraiser Settings */}
                <div>
                  <h3 className="section-label mb-2 flex items-center gap-2">
                    <span style={{ width: 8, height: 8, borderRadius: "var(--radius-sm)", background: "var(--fund-amber)", display: "inline-block" }} /> Fundraiser
                  </h3>
                  <div className="panel-inset p-3 space-y-2">
                    <SettingInput label="Fundraiser %" value={settings.fundraiserPct} onChange={(v) => updateSetting("fundraiserPct", v)} step={0.5} unit="%" accentColor="var(--fund-amber)" />
                    <SettingInput label="Fund Min $/u" value={settings.fundraiserMin} onChange={(v) => updateSetting("fundraiserMin", v)} step={0.25} unit="$" accentColor="var(--fund-amber)" />
                  </div>
                </div>
              </div>

              {/* Allocation Bar */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
                <div className="flex justify-between" style={{ fontSize: 11, marginBottom: 6 }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Retail % Allocation</span>
                  <span className="tnum" style={{ fontWeight: 700, color: overAllocated ? "var(--warn-red)" : "var(--text-secondary)" }}>{fmtPct(allocationPct)}</span>
                </div>
                <div className="alloc-track" style={{ height: 12, display: "flex", overflow: "hidden" }}>
                  <div style={{ width: `${Math.min(settings.jiFeePct, 100)}%`, background: "var(--ji-green)", transition: "width 0.2s" }} />
                  <div style={{ width: `${Math.min(settings.clientFeePct, 100 - settings.jiFeePct)}%`, background: "var(--client-blue)", transition: "width 0.2s" }} />
                  <div style={{ width: `${Math.min(settings.fundraiserPct, 100 - settings.jiFeePct - settings.clientFeePct)}%`, background: "var(--fund-amber)", transition: "width 0.2s" }} />
                </div>
                <div className="flex gap-3 mt-1.5" style={{ fontSize: 11 }}>
                  <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: 2, background: "var(--ji-green)", display: "inline-block" }} /> JI</span>
                  <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: 2, background: "var(--client-blue)", display: "inline-block" }} /> Client</span>
                  <span className="flex items-center gap-1"><span style={{ width: 6, height: 6, borderRadius: 2, background: "var(--fund-amber)", display: "inline-block" }} /> Fund</span>
                  <span className="flex items-center gap-1" style={{ color: "var(--text-muted)" }}><span style={{ width: 6, height: 6, borderRadius: 2, background: "var(--text-muted)", display: "inline-block" }} /> Costs</span>
                </div>
                {overAllocated && (
                  <div className="alert-danger" style={{ marginTop: 8, padding: "6px 10px", fontSize: 11, fontWeight: 500 }}>
                    Fees exceed 100% — retail cannot cover costs
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Financial Summary */}
          <div className="lg:col-span-2 space-y-4">
            <div className="panel p-4">
              <h2 className="section-label mb-3">Order Summary</h2>
              <div className="space-y-2" style={{ fontSize: 13 }}>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Total Units</span>
                  <span className="tnum" style={{ fontWeight: 700, color: "var(--text-primary)" }}>{totals.qty}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "var(--text-muted)" }}>Total Revenue</span>
                  <span className="tnum" style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{fmt(totals.revenue)}</span>
                </div>

                <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 8, marginTop: 4 }}>
                  <div className="section-label" style={{ marginBottom: 6 }}>Payouts</div>
                  <div className="space-y-1">
                    <div className="flex justify-between"><span style={{ color: "var(--fund-amber)" }}>Fundraiser</span><span className="tnum" style={{ color: "var(--fund-amber)" }}>{fmt(totals.fundPayout)}</span></div>
                    <div className="flex justify-between"><span style={{ color: "var(--client-blue)" }}>{settings.contractClient} Fees</span><span className="tnum" style={{ color: "var(--client-blue)" }}>{fmt(totals.clientFeeTotal)}</span></div>
                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Apparel Cost + Markup</span><span className="tnum" style={{ color: "var(--text-secondary)" }}>{fmt(totals.apparelTotal)}</span></div>
                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Deco COGS</span><span className="tnum" style={{ color: "var(--text-secondary)" }}>{fmt(totals.decoCogTotal)}</span></div>
                    <div className="flex justify-between" style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 4, marginTop: 4 }}>
                      <span style={{ fontWeight: 500, color: "var(--text-secondary)" }}>Total Payouts + COGS</span>
                      <span className="tnum" style={{ fontWeight: 600, color: "var(--text-primary)" }}>{fmt(totals.totalPayouts)}</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "2px solid rgba(52, 211, 153, 0.3)", paddingTop: 8, marginTop: 4 }}>
                  <div className="section-label" style={{ color: "var(--ji-green)", marginBottom: 6 }}>Jersey Ink Earnings</div>
                  <div className="space-y-1" style={{ fontSize: 12 }}>
                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>JI Fee Revenue</span><span className="tnum">{fmt(totals.jiFeeRevenue)}</span></div>
                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Apparel Markup Revenue</span><span className="tnum">{fmt(totals.apparelMarkupTotal)}</span></div>
                    <div className="flex justify-between"><span style={{ color: "var(--text-muted)" }}>Deco Profit (margin)</span><span className="tnum">{fmt(totals.decoProfitTotal)}</span></div>
                    <div className="flex justify-between" style={{ fontSize: 16, paddingTop: 6, borderTop: "1px solid rgba(52, 211, 153, 0.2)", marginTop: 4 }}>
                      <span style={{ fontWeight: 700, color: "var(--ji-green)" }}>JI Total Profit</span>
                      <span className="tnum" style={{ fontWeight: 700, color: "var(--ji-green)" }}>{fmt(totals.jiGross)}</span>
                    </div>
                  </div>
                </div>

                <div className="panel-inset p-3 text-center" style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: "var(--ji-green)", fontWeight: 500, marginBottom: 2 }}>Gross Margin</div>
                  <div className="tnum" style={{ fontSize: 28, fontWeight: 700, color: marginColor(totals.grossMargin) }}>{fmtPct(totals.grossMargin)}</div>
                </div>
              </div>
            </div>

            {/* Quote Intelligence */}
            {insights.length > 0 && (
              <div className="panel p-4">
                <h2 className="section-label mb-2">Quote Intelligence</h2>
                <div className="space-y-2">
                  {insights.map((w, i) => (
                    <div key={i} className={w.type === "danger" ? "alert-danger" : w.type === "warn" ? "alert-warn" : "alert-info"} style={{ padding: "6px 10px", fontSize: 11, fontWeight: 500 }}>
                      {w.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client View - simplified summary */}
      {isClient && (
        <div className="panel p-4 mb-4">
          <h2 className="section-label mb-3">{settings.clientName} — Quote Summary</h2>
          <div className="grid grid-cols-3 gap-4" style={{ fontSize: 13 }}>
            <div className="panel-inset p-3 text-center">
              <div className="kpi-label mb-1">Total</div>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: "var(--text-primary)" }}>{fmt(totals.revenue)}</div>
            </div>
            <div className="panel-inset p-3 text-center">
              <div className="kpi-label mb-1">Fundraiser Earnings</div>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: "var(--fund-amber)" }}>{fmt(totals.fundPayout)}</div>
            </div>
            <div className="panel-inset p-3 text-center">
              <div className="kpi-label mb-1">{settings.contractClient} Earnings</div>
              <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: "var(--client-blue)" }}>{fmt(totals.clientFeeTotal)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Product Table */}
      <div className={`panel mb-4 ${openDecoId ? "" : "overflow-hidden"}`}>
        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
          <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
            {isClient ? "Products" : "Product Pricing Table"}
          </h2>
        </div>
        <div className={openDecoId ? "" : "overflow-x-auto"}>
          <table className="rf-table">
            <thead>
              <tr>
                {!isClient && <th style={{ width: 28 }}></th>}
                <th style={{ textAlign: "left", paddingLeft: 10 }}>Product</th>
                <th style={{ textAlign: "left", width: 100 }}>Location</th>
                {!isClient && (
                  <th style={{ textAlign: "left", width: 180 }}>Decoration</th>
                )}
                {!isClient && (
                  <>
                    {showBreakdown && (
                      <th style={{ textAlign: "right", width: 64 }}>
                        <div>Deco</div><div style={{ fontWeight: 400, textTransform: "none", color: "var(--text-muted)" }}>Price</div>
                      </th>
                    )}
                    <th style={{ textAlign: "right", width: 72 }}>Apparel $</th>
                  </>
                )}
                <th style={{ textAlign: "right", width: 72 }}>Retail</th>
                {!isClient && (
                  <>
                    <th style={{ textAlign: "center", width: 72 }}>
                      <div>Fund</div><div style={{ fontWeight: 400, textTransform: "none", color: "var(--text-muted)" }}>$/unit</div>
                    </th>
                    <th style={{ textAlign: "center", width: 72 }}>
                      <div>Client</div><div style={{ fontWeight: 400, textTransform: "none", color: "var(--text-muted)" }}>$/unit</div>
                    </th>
                    <th style={{ textAlign: "center", width: 72 }}>
                      <div>JI</div><div style={{ fontWeight: 400, textTransform: "none", color: "var(--text-muted)" }}>$/unit</div>
                    </th>
                    {showBreakdown && (
                      <>
                        <th style={{ textAlign: "right", width: 64 }}>
                          <div>Deco</div><div style={{ fontWeight: 400, textTransform: "none", color: "var(--text-muted)" }}>Profit</div>
                        </th>
                        <th style={{ textAlign: "right", width: 64 }}>
                          <div>Apprl</div><div style={{ fontWeight: 400, textTransform: "none", color: "var(--text-muted)" }}>Markup</div>
                        </th>
                      </>
                    )}
                  </>
                )}
                <th style={{ textAlign: "center", width: 56 }}>Qty</th>
                <th style={{ textAlign: "right", width: 80 }}>{isClient ? "Subtotal" : "Revenue"}</th>
                {!isClient && <th style={{ textAlign: "right", width: 80, color: "var(--ji-green)" }}>JI Profit</th>}
                {!isClient && <th style={{ width: 28 }}></th>}
              </tr>
            </thead>
            <tbody>
              {calculated.map(({ item, calc, effectiveCogs, cogsTooltip }) => {
                if (isClient && item.qty === 0) return null;
                return (
                  <tr key={item.id} className={rowHealthClass(calc.marginPct, item.qty)} style={{ borderBottom: "1px solid var(--border-subtle)", position: openDecoId === item.id ? "relative" : undefined, zIndex: openDecoId === item.id ? 20 : undefined }}>
                    {!isClient && (
                      <td style={{ textAlign: "center", padding: "4px 2px" }}>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="btn-ghost"
                          style={{ width: 20, height: 20, fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-sm)" }}
                          title="Remove"
                        >
                          x
                        </button>
                      </td>
                    )}
                    <td style={{ padding: "4px 8px" }}>
                      {isClient ? (
                        <span style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{item.product}</span>
                      ) : (
                        <input
                          value={item.product}
                          onChange={(e) => updateItem(item.id, "product", e.target.value)}
                          className="field-editable"
                          style={{ width: "100%", padding: "3px 6px", fontSize: 13, fontWeight: 500 }}
                          placeholder="Product name..."
                        />
                      )}
                    </td>
                    {/* Location column */}
                    <td style={{ padding: "4px 4px", position: "relative" }}>
                      {isClient ? (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{item.location}</span>
                      ) : (
                        <div ref={openLocId === item.id ? locRef : undefined} style={{ position: "relative" }}>
                          <button
                            className="loc-btn"
                            data-open={openLocId === item.id}
                            onClick={() => setOpenLocId(openLocId === item.id ? null : item.id)}
                          >
                            {item.location}
                            <span className="loc-btn__arrow">{"\u25BE"}</span>
                          </button>
                          {openLocId === item.id && (
                            <div className="loc-dropdown">
                              {LOCATIONS.map((loc) => (
                                <button
                                  key={loc}
                                  className="loc-dropdown__item"
                                  data-active={item.location === loc}
                                  onClick={() => { updateLocation(item.id, loc); setOpenLocId(null); }}
                                >
                                  {loc}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    {/* Decoration column */}
                    {!isClient && (
                    <td style={{ padding: "4px 4px", position: "relative" }}>
                      <div ref={openDecoId === item.id ? popoverRef : undefined}>
                        {/* Chip button */}
                        <button
                          className="deco-chip"
                          data-open={openDecoId === item.id}
                          onClick={() => setOpenDecoId(openDecoId === item.id ? null : item.id)}
                          style={{ borderLeftColor: DECO_TYPE_COLORS[item.decoType] || DECO_TYPE_COLORS.custom, borderLeftWidth: 3 }}
                        >
                          <span className="deco-chip__badge" style={{ background: DECO_TYPE_COLORS[item.decoType] || DECO_TYPE_COLORS.custom }}>
                            {(DECO_TYPES.find((d) => d.key === item.decoType) || DECO_TYPES[0]).label}
                          </span>
                          <span className="deco-chip__summary">
                            {decoSummaryLabel(item.decoType, item.decoParam, item.location)}
                          </span>
                          {(item.decoType === "custom" || !item.decoType) ? (
                            <input
                              type="number"
                              value={item.decoCogs}
                              onChange={(e) => { e.stopPropagation(); updateItem(item.id, "decoCogs", parseFloat(e.target.value) || 0); }}
                              onClick={(e) => e.stopPropagation()}
                              step={0.01}
                              min={0}
                              className="field-editable-blue"
                              style={{ width: 54, padding: "1px 4px", textAlign: "right", fontSize: 11, fontWeight: 600, flexShrink: 0 }}
                            />
                          ) : (
                            <span
                              className="deco-chip__cogs"
                              title={cogsTooltip}
                              style={{ color: DECO_TYPE_COLORS[item.decoType] || "var(--text-primary)" }}
                            >
                              {fmt(effectiveCogs)}
                            </span>
                          )}
                          <span className="deco-chip__arrow">{"\u25BE"}</span>
                        </button>

                        {/* Popover */}
                        {openDecoId === item.id && (
                          <DecoPopover
                            item={item}
                            effectiveCogs={effectiveCogs}
                            cogsTooltip={cogsTooltip}
                            totalQty={totalQty}
                            onTypeChange={updateDecoType}
                            onParamChange={updateDecoParam}
                            onCogsChange={(id, v) => updateItem(id, "decoCogs", v)}
                            onOverrideCustom={(id) => setItems(prev => prev.map(it => it.id === id ? { ...it, decoType: "custom", decoParam: null, decoCogs: effectiveCogs } : it))}
                            onClose={() => setOpenDecoId(null)}
                          />
                        )}
                      </div>
                    </td>
                    )}
                    {!isClient && (
                      <>
                        {showBreakdown && (
                          <td className="field-readonly tnum" style={{ padding: "4px 6px", textAlign: "right", fontSize: 12 }}>
                            {fmt(calc.decoPrice)}
                          </td>
                        )}
                        <td style={{ padding: "4px 6px" }}>
                          <input
                            type="number"
                            value={item.apparelCost}
                            onChange={(e) => updateItem(item.id, "apparelCost", parseFloat(e.target.value) || 0)}
                            step={0.01}
                            min={0}
                            className="field-editable-blue"
                            style={{ width: "100%", padding: "3px 4px", textAlign: "right", fontSize: 13, fontWeight: 600 }}
                          />
                        </td>
                      </>
                    )}
                    <td style={{ padding: "4px 6px", textAlign: "right" }}>
                      <span className="tnum" style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14 }}>{fmt(calc.roundedRetail)}</span>
                    </td>
                    {!isClient && (
                      <>
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>
                          <div className="flex items-center justify-center gap-1">
                            <span className="tnum" style={{ fontWeight: 500, color: "var(--fund-amber)", fontSize: 12 }}>{fmt(calc.fundAmt)}</span>
                            {calc.fundMinApplied && <span style={{ fontSize: 9, background: "rgba(251,191,36,0.15)", color: "var(--fund-amber)", padding: "1px 4px", borderRadius: 2, fontWeight: 700 }}>M</span>}
                          </div>
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>
                          <div className="flex items-center justify-center gap-1">
                            <span className="tnum" style={{ fontWeight: 500, color: "var(--client-blue)", fontSize: 12 }}>{fmt(calc.clientFeeAmt)}</span>
                            {calc.clientMinApplied && <span style={{ fontSize: 9, background: "rgba(96,165,250,0.15)", color: "var(--client-blue)", padding: "1px 4px", borderRadius: 2, fontWeight: 700 }}>M</span>}
                          </div>
                        </td>
                        <td style={{ padding: "4px 6px", textAlign: "center" }}>
                          <div className="flex items-center justify-center gap-1">
                            <span className="tnum" style={{ fontWeight: 500, color: "var(--ji-green)", fontSize: 12 }}>{fmt(calc.jiFeeAmt)}</span>
                            {calc.jiMinApplied && <span style={{ fontSize: 9, background: "rgba(52,211,153,0.15)", color: "var(--ji-green)", padding: "1px 4px", borderRadius: 2, fontWeight: 700 }}>M</span>}
                          </div>
                        </td>
                        {showBreakdown && (
                          <>
                            <td className="tnum" style={{ padding: "4px 6px", textAlign: "right", color: "var(--ji-green)", fontSize: 12 }}>{fmt(calc.decoProfit)}</td>
                            <td className="tnum" style={{ padding: "4px 6px", textAlign: "right", color: "var(--ji-green)", fontSize: 12 }}>{fmt(calc.apparelMarkup)}</td>
                          </>
                        )}
                      </>
                    )}
                    <td style={{ padding: "4px 6px" }}>
                      {isClient ? (
                        <span className="tnum" style={{ display: "block", textAlign: "center", fontSize: 13, fontWeight: 500, color: "var(--text-primary)" }}>{item.qty}</span>
                      ) : (
                        <input
                          type="number"
                          step={1}
                          min={0}
                          value={item.qty}
                          onChange={(e) => updateItem(item.id, "qty", parseInt(e.target.value) || 0)}
                          className="field-editable-blue"
                          style={{ width: 50, padding: "3px 4px", textAlign: "center", fontSize: 13, fontWeight: 600 }}
                        />
                      )}
                    </td>
                    <td className="tnum" style={{ padding: "4px 6px", textAlign: "right", fontWeight: 500, color: item.qty > 0 ? "var(--text-secondary)" : "var(--text-muted)" }}>
                      {item.qty > 0 ? fmt(calc.revenue) : "\u2014"}
                    </td>
                    {!isClient && (
                      <td className="tnum" style={{
                        padding: "4px 6px",
                        textAlign: "right",
                        fontWeight: 700,
                        color: item.qty > 0 ? (calc.jiGross > 0 ? "var(--ji-green)" : calc.jiGross < 0 ? "var(--warn-red)" : "var(--text-muted)") : "var(--text-muted)",
                      }}>
                        {item.qty > 0 ? fmt(calc.jiGross) : "\u2014"}
                      </td>
                    )}
                    {!isClient && (
                      <td style={{ textAlign: "center", padding: "4px 2px" }}>
                        <button
                          onClick={() => duplicateItem(item.id)}
                          className="btn-ghost"
                          style={{ width: 20, height: 20, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: "var(--radius-sm)", color: "var(--text-muted)" }}
                          title="Duplicate"
                        >
                          +
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={isClient ? 3 : (showBreakdown ? 12 : 9)} style={{ textAlign: "right", fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Totals</td>
                <td className="tnum" style={{ textAlign: "center", fontSize: 12, color: "var(--text-secondary)" }}>{totals.qty}</td>
                <td className="tnum" style={{ textAlign: "right", fontSize: 12, color: "var(--text-secondary)" }}>{fmt(totals.revenue)}</td>
                {!isClient && <td className="tnum" style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--ji-green)" }}>{fmt(totals.jiGross)}</td>}
                {!isClient && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Revenue Waterfall */}
      {!isClient && totals.revenue > 0 && (
        <div className="panel p-4">
          <h3 className="section-label mb-3">Revenue Waterfall</h3>
          <div className="waterfall-bar" style={{ height: 36, display: "flex", fontSize: 11, fontWeight: 700, color: "white" }}>
            {[
              { val: totals.fundPayout, bg: "var(--fund-amber)", label: "Fund" },
              { val: totals.clientFeeTotal, bg: "var(--client-blue)", label: "Client" },
              { val: totals.rawApparelCost, bg: "#64748b", label: "Apparel" },
              { val: totals.decoCogTotal, bg: "var(--warn-red)", label: "Deco COGS" },
              { val: totals.decoProfitTotal, bg: "#14b8a6", label: "Deco Profit" },
              { val: totals.jiFeeRevenue, bg: "var(--ji-green)", label: "JI Fees" },
              { val: totals.apparelMarkupTotal, bg: "#6ee7b7", label: "Apprl Mkup" },
            ].map((seg, i) => {
              const pct = (seg.val / totals.revenue) * 100;
              return pct > 0.5 ? (
                <div key={i} style={{
                  width: `${pct}%`,
                  background: seg.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "width 0.2s",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }} title={`${seg.label}: ${fmt(seg.val)} (${fmtPct(pct)})`}>
                  {pct > 8 ? `${seg.label} ${fmtPct(pct)}` : ""}
                </div>
              ) : null;
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--fund-amber)", display: "inline-block" }} /> Fund {fmt(totals.fundPayout)}</span>
            <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--client-blue)", display: "inline-block" }} /> Client {fmt(totals.clientFeeTotal)}</span>
            <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: "#64748b", display: "inline-block" }} /> Apparel {fmt(totals.rawApparelCost)}</span>
            <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--warn-red)", display: "inline-block" }} /> Deco COGS {fmt(totals.decoCogTotal)}</span>
            <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: "#14b8a6", display: "inline-block" }} /> Deco Profit {fmt(totals.decoProfitTotal)}</span>
            <span className="flex items-center gap-1"><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--ji-green)", display: "inline-block" }} /> JI Fees+Markup {fmt(totals.jiFeeRevenue + totals.apparelMarkupTotal)}</span>
          </div>
        </div>
      )}

      {/* Sticky Performance Bar */}
      <div className={`sticky-perf-bar ${showStickyBar ? "visible" : ""}`}>
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-6">
          <div className="flex gap-6 items-center">
            <div>
              <span className="kpi-label" style={{ marginRight: 6 }}>Revenue</span>
              <span className="tnum" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{fmt(totals.revenue)}</span>
            </div>
            <div>
              <span className="kpi-label" style={{ marginRight: 6 }}>Profit</span>
              <span className="tnum" style={{ fontSize: 15, fontWeight: 700, color: "var(--ji-green)" }}>{fmt(totals.jiGross)}</span>
            </div>
            <div>
              <span className="kpi-label" style={{ marginRight: 6 }}>Margin</span>
              <span className="tnum" style={{ fontSize: 15, fontWeight: 700, color: marginColor(totals.grossMargin) }}>{fmtPct(totals.grossMargin)}</span>
            </div>
            <div>
              <span className="kpi-label" style={{ marginRight: 6 }}>Units</span>
              <span className="tnum" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>{totals.qty}</span>
            </div>
            <div>
              <span className="kpi-label" style={{ marginRight: 6 }}>Avg $/Unit</span>
              <span className="tnum" style={{ fontSize: 15, fontWeight: 700, color: "var(--text-secondary)" }}>{fmt(totals.avgProfitPerUnit)}</span>
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ji-green)", fontFamily: "'JetBrains Mono', monospace", letterSpacing: "0.05em" }}>JI</span>
        </div>
      </div>
    </>
  );
}
