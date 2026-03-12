import { useState } from "react";
import ScreenPrintCalculator from "./ScreenPrintCalculator";
import WebstoreCalculator from "./WebstoreCalculator";

const MODES = [
  { id: "screenprint", label: "Screen Print" },
  { id: "webstore", label: "Webstore" },
];

export default function App() {
  const [mode, setMode] = useState("screenprint");

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

          {/* Mode segmented control */}
          <div className="flex" style={{ background: "var(--bg-deep)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", padding: 2 }}>
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
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-[1440px] mx-auto p-4">
        {mode === "screenprint" && <ScreenPrintCalculator />}
        {mode === "webstore" && <WebstoreCalculator />}

        {/* Footer */}
        <div className="text-center mt-6 pb-4" style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'DM Sans', sans-serif" }}>
          Jersey Ink Custom Apparel — 1601 N. 9th St., Reading, PA 19604 — (610) 378-7844
        </div>
      </div>
    </div>
  );
}
