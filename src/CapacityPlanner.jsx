function formatPrice(val) {
  return "$" + val.toFixed(2);
}

export default function CapacityPlanner({
  pressHoursPerWeek, setPressHoursPerWeek,
  hoursBooked, setHoursBooked,
  revenueBooked, setRevenueBooked,
  targetHourlyRate, setTargetHourlyRate,
  laborRate, setLaborRate,
  operators, setOperators,
}) {
  const remainingHours = Math.max(0, pressHoursPerWeek - hoursBooked);
  const capacityPct = pressHoursPerWeek > 0 ? (hoursBooked / pressHoursPerWeek) * 100 : 0;

  // Labor costs
  const laborCostPerHour = laborRate * operators;
  const totalLaborCost = laborCostPerHour * hoursBooked;
  const weeklyLaborCost = laborCostPerHour * pressHoursPerWeek;

  // Revenue & profit
  const blendedRate = hoursBooked > 0 ? revenueBooked / hoursBooked : 0;
  const profitBooked = revenueBooked - totalLaborCost;
  const profitPerHour = hoursBooked > 0 ? profitBooked / hoursBooked : 0;
  const projectedWeeklyRevenue = blendedRate * pressHoursPerWeek;
  const projectedWeeklyProfit = projectedWeeklyRevenue - weeklyLaborCost;
  const targetWeeklyRevenue = targetHourlyRate * pressHoursPerWeek;
  const targetWeeklyProfit = targetWeeklyRevenue - weeklyLaborCost;

  // Minimum $/hr needed to cover labor + hit target profit
  const breakEvenRate = laborCostPerHour;

  const capacityColor = capacityPct > 95 ? "var(--warn-red)" : capacityPct > 80 ? "var(--fund-amber)" : "var(--ji-green)";
  const profitColor = profitPerHour >= (targetHourlyRate - laborCostPerHour) ? "var(--ji-green)" : profitPerHour >= 0 ? "var(--fund-amber)" : "var(--warn-red)";

  const inputStyle = { width: 90, padding: "5px 8px", textAlign: "center", fontSize: 13, fontWeight: 600 };

  return (
    <div className="panel p-4 mb-4">
      <h2 className="section-label mb-4">Weekly Capacity Planner</h2>

      {/* Inputs */}
      <div className="flex flex-wrap gap-6 mb-5">
        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>
            Press Hours / Week
          </label>
          <input
            type="number" min={1} step={1} value={pressHoursPerWeek}
            onChange={(e) => setPressHoursPerWeek(Math.max(1, Number(e.target.value)))}
            className="field-editable" style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>
            Hours Booked
          </label>
          <input
            type="number" min={0} step={0.5} value={hoursBooked}
            onChange={(e) => setHoursBooked(Math.max(0, Number(e.target.value)))}
            className="field-editable" style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>
            Revenue Booked ($)
          </label>
          <input
            type="number" min={0} step={50} value={revenueBooked}
            onChange={(e) => setRevenueBooked(Math.max(0, Number(e.target.value)))}
            className="field-editable" style={inputStyle}
          />
        </div>
        <div style={{ width: 1, height: 48, background: "var(--border-subtle)", alignSelf: "flex-end" }} />
        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>
            Labor Rate ($/hr)
          </label>
          <input
            type="number" min={0} step={0.5} value={laborRate}
            onChange={(e) => setLaborRate(Math.max(0, Number(e.target.value)))}
            className="field-editable" style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>
            Operators
          </label>
          <input
            type="number" min={1} step={1} value={operators}
            onChange={(e) => setOperators(Math.max(1, Number(e.target.value)))}
            className="field-editable" style={inputStyle}
          />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "var(--text-muted)", display: "block", marginBottom: 6, fontWeight: 500 }}>
            Target $/hr
          </label>
          <input
            type="number" min={0} step={5} value={targetHourlyRate}
            onChange={(e) => setTargetHourlyRate(Math.max(0, Number(e.target.value)))}
            className="field-editable" style={inputStyle}
          />
        </div>
      </div>

      {/* Labor Cost Summary */}
      <div className="panel-inset p-3 mb-4" style={{ fontSize: 12 }}>
        <span style={{ color: "var(--text-muted)" }}>
          Labor: <span className="tnum" style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{formatPrice(laborRate)}/hr × {operators} = {formatPrice(laborCostPerHour)}/hr</span>
          <span style={{ color: "var(--border-medium)", margin: "0 8px" }}>|</span>
          Break-even press rate: <span className="tnum" style={{ fontWeight: 600, color: "var(--fund-amber)" }}>{formatPrice(breakEvenRate)}/hr</span>
          <span style={{ color: "var(--border-medium)", margin: "0 8px" }}>|</span>
          Weekly labor cost: <span className="tnum" style={{ fontWeight: 600, color: "var(--text-secondary)" }}>{formatPrice(weeklyLaborCost)}</span>
        </span>
      </div>

      {/* Capacity Bar */}
      <div style={{ marginBottom: 20 }}>
        <div className="flex items-center justify-between mb-1.5" style={{ fontSize: 12 }}>
          <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Press Utilization</span>
          <span className="tnum" style={{ fontWeight: 700, color: capacityColor }}>{capacityPct.toFixed(0)}%</span>
        </div>
        <div className="alloc-track" style={{ height: 12 }}>
          <div style={{
            height: "100%", width: `${Math.min(100, capacityPct)}%`,
            background: capacityColor, borderRadius: "var(--radius-sm)",
            transition: "width 0.3s ease, background 0.3s ease",
          }} />
        </div>
        <div className="flex justify-between mt-1" style={{ fontSize: 11, color: "var(--text-muted)" }}>
          <span>{hoursBooked}h booked</span>
          <span>{remainingHours.toFixed(1)}h remaining</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="results-grid">
        <div className="panel-inset p-3 text-right">
          <div className="kpi-label mb-1">Revenue $/hr</div>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: blendedRate >= targetHourlyRate ? "var(--ji-green)" : "var(--fund-amber)" }}>
            {formatPrice(blendedRate)}
          </div>
          <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            target: {formatPrice(targetHourlyRate)}/hr
          </div>
        </div>
        <div className="panel-inset p-3 text-right">
          <div className="kpi-label mb-1">Profit $/hr</div>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: profitColor }}>
            {formatPrice(profitPerHour)}
          </div>
          <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            after {formatPrice(laborCostPerHour)}/hr labor
          </div>
        </div>
        <div className="panel-inset p-3 text-right">
          <div className="kpi-label mb-1">Profit This Week</div>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: profitBooked >= 0 ? "var(--ji-green)" : "var(--warn-red)" }}>
            {formatPrice(profitBooked)}
          </div>
          <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            {formatPrice(revenueBooked)} rev - {formatPrice(totalLaborCost)} labor
          </div>
        </div>
        <div className="panel-inset p-3 text-right">
          <div className="kpi-label mb-1">Projected Weekly</div>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: projectedWeeklyProfit >= targetWeeklyProfit ? "var(--ji-green)" : "var(--fund-amber)" }}>
            {formatPrice(projectedWeeklyProfit)}
          </div>
          <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            profit at current pace
          </div>
        </div>
        <div className="panel-inset p-3 text-right">
          <div className="kpi-label mb-1">Remaining Capacity</div>
          <div className="tnum" style={{ fontSize: 22, fontWeight: 700, color: remainingHours > 0 ? "var(--text-primary)" : "var(--warn-red)" }}>
            {remainingHours.toFixed(1)}h
          </div>
          <div className="tnum" style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            worth {formatPrice(remainingHours * (targetHourlyRate - laborCostPerHour))} profit
          </div>
        </div>
      </div>
    </div>
  );
}
