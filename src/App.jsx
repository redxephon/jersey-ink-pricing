import { useState, useEffect } from "react";
import ScreenPrintCalculator from "./ScreenPrintCalculator";
import EmbroideryCalculator from "./EmbroideryCalculator";
import DTFCalculator from "./DTFCalculator";
import WebstoreCalculator from "./WebstoreCalculator";
import ShopEconomics from "./ShopEconomics";

const MODES = [
  { id: "screenprint", label: "Screen Print", shortLabel: "Print" },
  { id: "embroidery", label: "Embroidery", shortLabel: "Emb" },
  { id: "dtf", label: "DTF", shortLabel: "DTF" },
  { id: "webstore", label: "Webstore", shortLabel: "Store" },
  { id: "economics", label: "Shop Economics", shortLabel: "Econ" },
];

export default function App() {
  const [mode, setMode] = useState("screenprint");
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("ji-theme") || "dark";
    }
    return "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("ji-theme", theme);
  }, [theme]);

  // Shop Economics state — shared across all calculators
  const [costItems, setCostItems] = useState([
    { id: 1, label: "Rent/Lease/Mortgage", amount: 5000 },
    { id: 2, label: "Equipment Leases", amount: 2647.12 },
    { id: 3, label: "FXV", amount: 463.99 },
    { id: 4, label: "Insurance", amount: 160 },
    { id: 5, label: "Google Suite, DropBox", amount: 100 },
    { id: 6, label: "Utilities", amount: 1150 },
    { id: 7, label: "GraphX + Printavo", amount: 2350 },
    { id: 8, label: "Payroll", amount: 32000 },
    { id: 9, label: "Phone, Internet", amount: 250 },
    { id: 10, label: "Marketing", amount: 725 },
  ]);
  const [impressionsPerHour, setImpressionsPerHour] = useState(500);
  const [utilization, setUtilization] = useState(60);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [numPresses, setNumPresses] = useState(1);
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const [adminRate, setAdminRate] = useState(40);
  const [artworkRate, setArtworkRate] = useState(60);
  const [screensRate, setScreensRate] = useState(40);
  const [adminMinutes, setAdminMinutes] = useState(30);
  const [artworkMinutes, setArtworkMinutes] = useState(45);
  const [screenMinutes, setScreenMinutes] = useState(25);
  const [targetMargin, setTargetMargin] = useState(45);
  const [hoursBooked, setHoursBooked] = useState(0);
  const [revenueBooked, setRevenueBooked] = useState(0);

  const shopEconomics = {
    costItems, setCostItems,
    impressionsPerHour, setImpressionsPerHour,
    utilization, setUtilization,
    hoursPerDay, setHoursPerDay,
    numPresses, setNumPresses,
    daysPerWeek, setDaysPerWeek,
    adminRate, setAdminRate,
    artworkRate, setArtworkRate,
    screensRate, setScreensRate,
    adminMinutes, setAdminMinutes,
    artworkMinutes, setArtworkMinutes,
    screenMinutes, setScreenMinutes,
    targetMargin, setTargetMargin,
    hoursBooked, setHoursBooked,
    revenueBooked, setRevenueBooked,
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg-deep)" }}>
      {/* Command Header */}
      <header className="panel" style={{ borderRadius: 0, borderTop: "none", borderLeft: "none", borderRight: "none" }}>
        <div className="max-w-[1440px] mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span style={{ color: "var(--ji-green)", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 14, letterSpacing: "0.05em" }}>
              JI
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>/</span>
            <span style={{ color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif", fontWeight: 500, fontSize: 13 }}>
              Pricing Tools
            </span>
          </div>

          {/* Mode segmented control — scrollable on mobile */}
          <div className="flex items-center gap-3">
            <div className="tab-bar-scroll" style={{ background: "var(--bg-deep)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", padding: 2 }}>
              {MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id)}
                  className={mode === m.id ? "btn-active" : ""}
                  style={{
                    padding: "5px 16px",
                    borderRadius: "var(--radius-sm)",
                    fontSize: 12,
                    fontWeight: mode === m.id ? 600 : 400,
                    fontFamily: "'DM Sans', sans-serif",
                    background: mode === m.id ? "var(--bg-surface)" : "transparent",
                    color: mode === m.id ? "var(--ji-green)" : "var(--text-muted)",
                    border: mode === m.id ? "1px solid var(--border-medium)" : "1px solid transparent",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  <span className="tab-label-full">{m.label}</span>
                  <span className="tab-label-short">{m.shortLabel}</span>
                </button>
              ))}
            </div>

            {/* Theme toggle */}
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              style={{
                width: 32, height: 32, borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
                background: "var(--bg-deep)",
                color: "var(--text-muted)",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, transition: "all 0.15s ease",
                flexShrink: 0,
              }}
            >
              {theme === "dark" ? "\u2600" : "\u263E"}
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-[1440px] mx-auto p-4">
        {mode === "screenprint" && <ScreenPrintCalculator shopEconomics={shopEconomics} />}
        {mode === "webstore" && <WebstoreCalculator />}
        {mode === "economics" && (
          <ShopEconomics
            {...shopEconomics}
            pressTime={null}
            quickBreakdown={null}
          />
        )}
        {mode === "embroidery" && <EmbroideryCalculator shopEconomics={shopEconomics} />}
        {mode === "dtf" && <DTFCalculator shopEconomics={shopEconomics} />}

        {/* Footer */}
        <div className="text-center mt-6 pb-4" style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
          Jersey Ink Custom Apparel — 1601 N. 9th St., Reading, PA 19604 — (610) 378-7844
        </div>
      </div>
    </div>
  );
}
