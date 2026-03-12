import { useState, useMemo } from "react";

const DEFAULT_PARAMS = [
  { screens: 1, setup: 44.17, variable: 0.8421, minQty: 12 },
  { screens: 2, setup: 65.03, variable: 1.0258, minQty: 12 },
  { screens: 3, setup: 95.57, variable: 1.1066, minQty: 12 },
  { screens: 4, setup: 107.25, variable: 1.3436, minQty: 13 },
  { screens: 5, setup: 189.87, variable: 1.1877, minQty: 50 },
  { screens: 6, setup: 202.31, variable: 1.3252, minQty: 50 },
];

const QTY_TIERS = [
  { label: "12", min: 12, rep: 12 },
  { label: "13-24", min: 13, rep: 13 },
  { label: "25-49", min: 25, rep: 25 },
  { label: "50-74", min: 50, rep: 50 },
  { label: "75-149", min: 75, rep: 75 },
  { label: "150-249", min: 150, rep: 150 },
  { label: "250-499", min: 250, rep: 250 },
  { label: "500-999", min: 500, rep: 500 },
  { label: "1000-1999", min: 1000, rep: 1000 },
  { label: "2000+", min: 2000, rep: 2000 },
];

const CURRENT_2023 = {
  1: [5.15, 3.82, 2.16, 1.56, 1.41, 1.25, 1.15, 1.05, 0.95, null],
  2: [6.90, 5.64, 3.22, 2.62, 2.08, 1.50, 1.20, 1.10, 1.05, null],
  3: [9.75, 7.76, 4.63, 3.53, 2.27, 1.80, 1.55, 1.20, 1.10, null],
  4: [null, 9.70, 5.04, 4.46, 2.48, 2.10, 1.80, 1.50, 1.25, null],
  5: [null, null, null, 5.50, 2.90, 2.45, 2.00, 1.75, 1.45, null],
  6: [null, null, null, 6.04, 2.97, 2.65, 2.20, 1.95, 1.65, null],
};

const SCREEN_COLORS = [
  { bg: "bg-red-50", border: "border-red-200", text: "text-red-700" },
  { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700" },
  { bg: "bg-yellow-50", border: "border-yellow-200", text: "text-yellow-700" },
  { bg: "bg-green-50", border: "border-green-200", text: "text-green-700" },
  { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700" },
  { bg: "bg-purple-50", border: "border-purple-200", text: "text-purple-700" },
];

function calcPrice(setup, variable, qty, increase) {
  if (qty <= 0) return 0;
  return (1 + increase / 100) * (setup / qty + variable);
}

function formatPrice(val) {
  return "$" + val.toFixed(2);
}

function formatPct(val) {
  const sign = val >= 0 ? "+" : "";
  return sign + val.toFixed(1) + "%";
}

function initParams() {
  return DEFAULT_PARAMS.map((p) => ({ ...p }));
}

export default function App() {
  const [increase, setIncrease] = useState(15);
  const [params, setParams] = useState(initParams);
  const [quickScreens, setQuickScreens] = useState(1);
  const [quickQty, setQuickQty] = useState(100);
  const [showComparison, setShowComparison] = useState(false);
  const [activeTab, setActiveTab] = useState("card");

  const updateParam = (idx, field, value) => {
    setParams((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: parseFloat(value) || 0 };
      return next;
    });
  };

  const rateCard = useMemo(() => {
    return params.map((p) => {
      return QTY_TIERS.map((tier) => {
        if (tier.rep < p.minQty) return null;
        return calcPrice(p.setup, p.variable, tier.rep, increase);
      });
    });
  }, [params, increase]);

  const quickPrice = useMemo(() => {
    const p = params[quickScreens - 1];
    if (!p || quickQty < 1) return null;
    return calcPrice(p.setup, p.variable, quickQty, increase);
  }, [params, quickScreens, quickQty, increase]);

  const quickTotalCost = quickPrice !== null ? quickPrice * quickQty : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Jersey Ink — Screen Printing Calculator
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                Price = (1 + Increase%) × (Setup$ ÷ Qty + Variable$/Unit)
              </p>
            </div>
            <div className="flex items-center gap-3 bg-slate-900/50 rounded-lg p-3">
              <label className="text-slate-300 text-sm font-medium whitespace-nowrap">
                Price Increase
              </label>
              <input
                type="range"
                min={-20}
                max={50}
                step={1}
                value={increase}
                onChange={(e) => setIncrease(Number(e.target.value))}
                className="w-32 accent-blue-400"
              />
              <span className="text-white font-bold text-xl w-16 text-right tabular-nums">
                {increase}%
              </span>
            </div>
          </div>
        </div>

        {/* Quick Calculator */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Quick Price Check
          </h2>
          <div className="flex flex-wrap items-end gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Screens (Colors)</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6].map((s) => (
                  <button
                    key={s}
                    onClick={() => setQuickScreens(s)}
                    className={`w-10 h-10 rounded-lg font-bold text-sm transition-all ${
                      quickScreens === s
                        ? `${SCREEN_COLORS[s - 1].bg} ${SCREEN_COLORS[s - 1].text} ${SCREEN_COLORS[s - 1].border} border-2 shadow-sm`
                        : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={quickQty}
                onChange={(e) => setQuickQty(Math.max(1, Number(e.target.value)))}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-center font-medium focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none"
              />
            </div>
            <div className="flex-1" />
            {quickPrice !== null && (
              <div className="flex gap-8 items-end">
                <div className="text-right">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Per Unit</div>
                  <div className="text-3xl font-bold text-slate-800 tabular-nums">
                    {formatPrice(quickPrice)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">
                    Total ({quickQty} units)
                  </div>
                  <div className="text-2xl font-semibold text-slate-600 tabular-nums">
                    {formatPrice(quickTotalCost)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 uppercase tracking-wider">Setup + Variable</div>
                  <div className="text-sm text-gray-500 tabular-nums leading-relaxed">
                    ${params[quickScreens - 1].setup.toFixed(2)} ÷ {quickQty} ={" "}
                    <span className="font-medium">
                      ${(params[quickScreens - 1].setup / quickQty).toFixed(4)}
                    </span>
                    <br />+ ${params[quickScreens - 1].variable.toFixed(4)} variable
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-4">
          {[
            { id: "card", label: "Rate Card" },
            { id: "params", label: "Parameters" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="flex-1" />
          {activeTab === "card" && (
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showComparison}
                onChange={(e) => setShowComparison(e.target.checked)}
                className="rounded accent-blue-500"
              />
              Show % change from 2023
            </label>
          )}
        </div>

        {/* Rate Card */}
        {activeTab === "card" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-white uppercase tracking-wider w-20">
                      Screens
                    </th>
                    {QTY_TIERS.map((tier) => (
                      <th
                        key={tier.label}
                        className="px-2 py-3 text-center text-xs font-semibold text-white uppercase tracking-wider"
                      >
                        {tier.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rateCard.map((row, si) => (
                    <tr key={si} className={`${SCREEN_COLORS[si].bg} border-b border-gray-100`}>
                      <td
                        className={`px-3 py-3 font-bold ${SCREEN_COLORS[si].text} text-center text-base`}
                      >
                        {si + 1}
                      </td>
                      {row.map((price, qi) => {
                        const old2023 = CURRENT_2023[si + 1][qi];
                        const pctChange =
                          price !== null && old2023 !== null
                            ? ((price - old2023) / old2023) * 100
                            : null;

                        return (
                          <td key={qi} className="px-2 py-3 text-center">
                            {price === null ? (
                              <span className="text-red-500 font-bold text-xs">CALL</span>
                            ) : (
                              <div>
                                <div className="font-semibold text-gray-800 tabular-nums">
                                  {formatPrice(price)}
                                </div>
                                {showComparison && pctChange !== null && (
                                  <div
                                    className={`text-xs tabular-nums mt-0.5 ${
                                      pctChange > 20
                                        ? "text-red-500"
                                        : pctChange > 0
                                        ? "text-orange-500"
                                        : pctChange > -5
                                        ? "text-gray-400"
                                        : "text-green-600"
                                    }`}
                                  >
                                    {formatPct(pctChange)}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Parameters Panel */}
        {activeTab === "params" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Cost Parameters Per Screen Count
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                  Setup$ = fixed cost amortized over quantity | Variable$/Unit = per-unit floor cost
                </p>
              </div>
              <button
                onClick={() => setParams(initParams)}
                className="text-xs px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset to Fitted
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {params.map((p, i) => (
                <div
                  key={i}
                  className={`${SCREEN_COLORS[i].bg} ${SCREEN_COLORS[i].border} border rounded-lg p-4`}
                >
                  <div className={`font-bold ${SCREEN_COLORS[i].text} mb-3`}>
                    {p.screens} Screen{p.screens > 1 ? "s" : ""}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-16">Setup $</label>
                      <input
                        type="number"
                        step={1}
                        value={p.setup}
                        onChange={(e) => updateParam(i, "setup", e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-center font-medium focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-16">Var $/u</label>
                      <input
                        type="number"
                        step={0.01}
                        value={p.variable}
                        onChange={(e) => updateParam(i, "variable", e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-center font-medium focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500 w-16">Min Qty</label>
                      <input
                        type="number"
                        step={1}
                        value={p.minQty}
                        onChange={(e) => updateParam(i, "minQty", e.target.value)}
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm text-center font-medium focus:ring-2 focus:ring-blue-400 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Fees */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Additional Fees & Notes
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-1.5 text-sm">
            {[
              ["Screen Fee", "$27.00 /screen"],
              ["Screen Set-up (Reorder <1yr)", "$7.00 /screen"],
              ["Fold and Bag", "$0.45 each"],
              ["Sticker", "+$0.25 each"],
              ["Pantone Color Match", "+$15.00 each"],
              ["Fleece Printing", "+$0.50 each"],
              ["Sleeve/Pocket/Pant Leg", "+$0.25 /location"],
              ["Unbagging/Detagging", "$0.15 each"],
              ["Spoilage Allowance", "3%"],
              ["Minimum Order", "12 pieces"],
              ["Turnaround", "2-3 weeks"],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">{label}</span>
                <span className="font-medium text-gray-800">{value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 mt-6 pb-4">
          Jersey Ink Custom Apparel — 1601 N. 9th St., Reading, PA 19604 — (610) 378-7844
        </div>
      </div>
    </div>
  );
}
