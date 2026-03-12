import { useMemo } from "react";
import { buildProfitabilityTable } from "./jobAnalysis";
import { fmt } from "./fmt";

export default function ProfitabilityAnalysis({
  params, locations, increase, perUnitAddOns, complexityCostAdder, complexity,
  garmentCost, garmentMarkup, pantoneColors, qtyTiers,
  targetProfit, setTargetProfit, targetHourlyRate,
}) {
  const table = useMemo(() => {
    return buildProfitabilityTable(
      params, locations, increase, perUnitAddOns, complexityCostAdder,
      complexity, garmentCost, garmentMarkup, pantoneColors, qtyTiers
    );
  }, [params, locations, increase, perUnitAddOns, complexityCostAdder, complexity, garmentCost, garmentMarkup, pantoneColors, qtyTiers]);

  const breakEvenRow = table.find((r) => r.valid && r.profit >= 0);
  const targetRow = table.find((r) => r.valid && r.profit >= targetProfit);

  return (
    <div className="panel p-4 mb-4">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="section-label">Break-even & Profit Target</h2>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Based on current Quick Price Check configuration
          </p>
        </div>
        <label className="flex items-center gap-2" style={{ fontSize: 12, color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 600 }}>Target Profit $</span>
          <input
            type="number"
            min={0}
            step={50}
            value={targetProfit}
            onChange={(e) => setTargetProfit(Math.max(0, Number(e.target.value)))}
            className="field-editable"
            style={{ width: 80, padding: "5px 8px", textAlign: "center", fontSize: 13, fontWeight: 600 }}
          />
        </label>
      </div>

      {/* Summary callout */}
      <div className="panel-inset p-3 mb-4" style={{ fontSize: 13 }}>
        <span style={{ color: "var(--text-muted)" }}>
          {breakEvenRow ? (
            <>Break-even at <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{breakEvenRow.qty} units</span> ({fmt(breakEvenRow.pricePerUnit)}/ea)</>
          ) : (
            <span style={{ color: "var(--warn-red)" }}>No break-even found in range</span>
          )}
          {" | "}
          {targetRow ? (
            <>Target {fmt(targetProfit)} profit at <span style={{ fontWeight: 700, color: "var(--ji-green)" }}>{targetRow.qty} units</span> ({fmt(targetRow.pricePerUnit)}/ea)</>
          ) : (
            <span style={{ color: "var(--fund-amber)" }}>Need 2000+ units for {fmt(targetProfit)} profit</span>
          )}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="rf-table">
          <thead>
            <tr>
              <th style={{ textAlign: "center" }}>Qty</th>
              <th style={{ textAlign: "center" }}>Price/ea</th>
              <th style={{ textAlign: "center" }}>Revenue</th>
              <th style={{ textAlign: "center" }}>Cost</th>
              <th style={{ textAlign: "center" }}>Profit</th>
              <th style={{ textAlign: "center" }}>$/hr</th>
              <th style={{ textAlign: "center", width: 50 }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => {
              if (!row.valid) {
                return (
                  <tr key={row.qty} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ textAlign: "center", padding: "8px 6px", fontWeight: 600 }}>{row.label}</td>
                    <td colSpan={6} style={{ textAlign: "center", padding: "8px 6px" }}>
                      <span style={{ color: "var(--warn-red)", fontSize: 10, fontWeight: 700 }}>BELOW MIN</span>
                    </td>
                  </tr>
                );
              }
              const isLoss = row.profit < 0;
              const meetsTarget = row.profit >= targetProfit;
              const rowClass = isLoss ? "row-danger" : meetsTarget ? "row-healthy" : row.profit > 0 ? "row-warning" : "row-neutral";
              const hrColor = row.dollarsPerHour >= targetHourlyRate ? "var(--ji-green)" : row.dollarsPerHour >= targetHourlyRate * 0.5 ? "var(--fund-amber)" : "var(--warn-red)";

              return (
                <tr key={row.qty} className={rowClass} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td className="tnum" style={{ textAlign: "center", padding: "8px 6px", fontWeight: 600 }}>{row.label}</td>
                  <td className="tnum" style={{ textAlign: "center", padding: "8px 6px" }}>{fmt(row.pricePerUnit)}</td>
                  <td className="tnum" style={{ textAlign: "center", padding: "8px 6px" }}>{fmt(row.totalRevenue)}</td>
                  <td className="tnum" style={{ textAlign: "center", padding: "8px 6px", color: "var(--text-muted)" }}>{fmt(row.totalCost)}</td>
                  <td className="tnum" style={{ textAlign: "center", padding: "8px 6px", fontWeight: 600, color: isLoss ? "var(--warn-red)" : "var(--ji-green)" }}>
                    {isLoss ? "-" : ""}{fmt(Math.abs(row.profit))}
                  </td>
                  <td className="tnum" style={{ textAlign: "center", padding: "8px 6px", color: hrColor, fontWeight: 600 }}>
                    {fmt(row.dollarsPerHour)}
                  </td>
                  <td style={{ textAlign: "center", padding: "8px 6px" }}>
                    <span style={{
                      display: "inline-block", width: 10, height: 10, borderRadius: "50%",
                      background: isLoss ? "var(--warn-red)" : meetsTarget ? "var(--ji-green)" : "var(--fund-amber)",
                    }} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
