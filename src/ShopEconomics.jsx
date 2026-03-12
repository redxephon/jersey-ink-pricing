import { useMemo } from "react";

function fmt(val) {
  return "$" + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtK(val) {
  if (val >= 100000) return "$" + (val / 1000).toFixed(1) + "k";
  if (val >= 1000) return "$" + Math.round(val).toLocaleString("en-US");
  return fmt(val);
}

export default function ShopEconomics({
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
  pressTime,
  quickBreakdown,
}) {
  // --- Computed values ---
  const monthlyCosts = useMemo(() => costItems.reduce((s, c) => s + c.amount, 0), [costItems]);

  const dashboard = useMemo(() => {
    const util = utilization / 100;
    const margin = targetMargin / 100;
    const productiveHrsPerDay = hoursPerDay * util * numPresses;
    const productiveHrsPerWeek = productiveHrsPerDay * daysPerWeek;
    const productiveHrsPerMonth = productiveHrsPerWeek * 4.33;

    const monthlyRevenue = margin < 1 ? monthlyCosts / (1 - margin) : monthlyCosts * 10;
    const weeklyRevenue = monthlyRevenue / 4.33;
    const dailyRevenue = weeklyRevenue / daysPerWeek;
    const yearlyRevenue = monthlyRevenue * 12;

    const dailyBreakEven = monthlyCosts / (daysPerWeek * 4.33);
    const weeklyBreakEven = monthlyCosts / 4.33;
    const yearlyBreakEven = monthlyCosts * 12;

    const minShopRate = productiveHrsPerMonth > 0 ? monthlyCosts / productiveHrsPerMonth : 0;
    const idealShopRate = productiveHrsPerMonth > 0 ? monthlyRevenue / productiveHrsPerMonth : 0;

    // Cost per impression — raw: full capacity (all presses, all hours)
    const fullCapacityImpressions = impressionsPerHour * hoursPerDay * daysPerWeek * 4.33 * numPresses;
    const costPerImpression = fullCapacityImpressions > 0 ? monthlyCosts / fullCapacityImpressions : 0;

    // Cost per impression — with utilization: actual throughput
    const actualImpressions = impressionsPerHour * productiveHrsPerMonth;
    const costPerImpressionUtil = actualImpressions > 0 ? monthlyCosts / actualImpressions : 0;

    const nonPressCostPerJob = (adminRate * adminMinutes + artworkRate * artworkMinutes + screensRate * screenMinutes) / 60;

    return {
      monthlyRevenue, weeklyRevenue, dailyRevenue, yearlyRevenue,
      dailyBreakEven, weeklyBreakEven, monthlyBreakEven: monthlyCosts, yearlyBreakEven,
      minShopRate, idealShopRate, costPerImpression, costPerImpressionUtil,
      productiveHrsPerDay, productiveHrsPerWeek, productiveHrsPerMonth,
      nonPressCostPerJob,
    };
  }, [monthlyCosts, utilization, hoursPerDay, numPresses, daysPerWeek, targetMargin, impressionsPerHour, adminRate, artworkRate, screensRate, adminMinutes, artworkMinutes, screenMinutes]);

  // Job preview
  const jobHours = pressTime?.totalHours || 0;
  const jobRevenue = quickBreakdown?.orderTotal || 0;
  const hasJob = quickBreakdown !== null && jobHours > 0;

  const handleAddJob = () => {
    setHoursBooked((h) => +(h + jobHours).toFixed(2));
    setRevenueBooked((r) => +(r + jobRevenue).toFixed(2));
  };

  // Cost item helpers
  const addCostItem = () => {
    setCostItems((prev) => [...prev, { id: Date.now(), label: "", amount: 0 }]);
  };
  const removeCostItem = (id) => {
    setCostItems((prev) => prev.filter((c) => c.id !== id));
  };
  const updateCostItem = (id, field, value) => {
    setCostItems((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  const inputStyle = { width: 90, padding: "5px 8px", textAlign: "center", fontSize: 13, fontWeight: 600 };
  const summaryStyle = {
    cursor: "pointer", fontSize: 13, fontWeight: 600, color: "var(--text-primary)",
    padding: "10px 14px", background: "var(--bg-deep)", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--border-subtle)", userSelect: "none", listStyle: "none",
  };

  const blendedRate = hoursBooked > 0 ? revenueBooked / hoursBooked : 0;
  const withHours = hoursBooked + jobHours;
  const withRevenue = revenueBooked + jobRevenue;
  const withBlended = withHours > 0 ? withRevenue / withHours : 0;

  // Weekly progress
  const weeklyTarget = dashboard.weeklyRevenue;
  const weeklyPct = weeklyTarget > 0 ? Math.min(100, (revenueBooked / weeklyTarget) * 100) : 0;
  const hoursPct = dashboard.productiveHrsPerWeek > 0 ? Math.min(100, (hoursBooked / dashboard.productiveHrsPerWeek) * 100) : 0;

  return (
    <div className="panel p-4 mb-4">
      <h2 className="section-label mb-4">Shop Economics</h2>

      {/* ═══ DASHBOARD (always visible, top) ═══ */}
      <div style={{ marginBottom: 20 }}>

        {/* Shop Settings Summary — Mini KPI Grid */}
        <div className="flex flex-wrap gap-4 mb-4" style={{ fontSize: 12 }}>
          {[
            { label: "Monthly Costs", value: fmtK(monthlyCosts) },
            { label: "Imp/hr", value: impressionsPerHour.toString() },
            { label: "Utilization", value: utilization + "%" },
            { label: "Margin", value: targetMargin + "%" },
          ].map(({ label, value }) => (
            <div key={label} className="panel-inset p-2 text-center" style={{ minWidth: 80, flex: 1 }}>
              <div className="tnum" style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{value}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Hint when no job configured */}
        {!hasJob && (
          <div className="alert-info" style={{ padding: "8px 12px", fontSize: 12, marginBottom: 16 }}>
            Configure a job in Screen Print, Embroidery, or DTF to preview it here.
          </div>
        )}

        {/* Revenue & Break-Even Targets side by side */}
        <div className="econ-dashboard-grid" style={{ marginBottom: 16 }}>
          <div className="panel-inset panel-inset-green p-3">
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ji-green)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Revenue Targets
            </div>
            {[
              { label: `Daily (${daysPerWeek} day wk)`, value: dashboard.dailyRevenue },
              { label: "Weekly", value: dashboard.weeklyRevenue },
              { label: "Monthly", value: dashboard.monthlyRevenue },
              { label: "Yearly", value: dashboard.yearlyRevenue },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between" style={{ fontSize: 12, padding: "3px 0" }}>
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span className="tnum" style={{ fontWeight: 600 }}>{fmtK(value)}</span>
              </div>
            ))}

            {/* Weekly progress bar */}
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
              <div className="flex items-center justify-between" style={{ fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Revenue This Week</span>
                <span className="tnum" style={{ fontWeight: 600, color: weeklyPct >= 100 ? "var(--ji-green)" : "var(--text-secondary)" }}>
                  {fmtK(revenueBooked)} / {fmtK(weeklyTarget)} ({weeklyPct.toFixed(0)}%)
                </span>
              </div>
              <div className="alloc-track" style={{ height: 12 }}>
                <div style={{
                  height: "100%", width: `${Math.min(100, weeklyPct)}%`,
                  background: weeklyPct >= 100 ? "var(--ji-green)" : weeklyPct >= 50 ? "var(--fund-amber)" : "var(--warn-red)",
                  borderRadius: "var(--radius-sm)", transition: "width 0.3s ease",
                }} />
              </div>

              {/* Hours progress bar */}
              <div style={{ marginTop: 8 }}>
                <div className="flex items-center justify-between" style={{ fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Hours This Week</span>
                  <span className="tnum" style={{ fontWeight: 600, color: hoursPct >= 100 ? "var(--ji-green)" : "var(--text-secondary)" }}>
                    {hoursBooked.toFixed(1)}h / {dashboard.productiveHrsPerWeek.toFixed(1)}h ({hoursPct.toFixed(0)}%)
                  </span>
                </div>
                <div className="alloc-track" style={{ height: 12 }}>
                  <div style={{
                    height: "100%", width: `${Math.min(100, hoursPct)}%`,
                    background: hoursPct >= 100 ? "var(--ji-green)" : hoursPct >= 50 ? "var(--client-blue)" : "var(--text-muted)",
                    borderRadius: "var(--radius-sm)", transition: "width 0.3s ease",
                  }} />
                </div>
              </div>
            </div>
          </div>
          <div className="panel-inset panel-inset-amber p-3">
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fund-amber)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Break-Even Targets
            </div>
            {[
              { label: `Daily (${daysPerWeek} day wk)`, value: dashboard.dailyBreakEven },
              { label: "Weekly", value: dashboard.weeklyBreakEven },
              { label: "Monthly", value: dashboard.monthlyBreakEven },
              { label: "Yearly", value: dashboard.yearlyBreakEven },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between" style={{ fontSize: 12, padding: "3px 0" }}>
                <span style={{ color: "var(--text-muted)" }}>{label}</span>
                <span className="tnum" style={{ fontWeight: 600 }}>{fmtK(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Estimated Rates */}
        <div className="panel-inset panel-inset-blue p-3" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--client-blue)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Estimated Rates
          </div>
          {[
            { label: "Min $/hr", value: fmt(dashboard.minShopRate), color: "var(--fund-amber)" },
            { label: "Ideal $/hr", value: fmt(dashboard.idealShopRate), color: "var(--ji-green)" },
            { label: "Cost/Imp (100%)", value: fmt(dashboard.costPerImpression) },
            { label: "Cost/Imp (actual)", value: fmt(dashboard.costPerImpressionUtil) },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex justify-between" style={{ fontSize: 12, padding: "3px 0" }}>
              <span style={{ color: "var(--text-muted)" }}>{label}</span>
              <span className="tnum" style={{ fontWeight: 600, color: color || "var(--text-primary)" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Utilization Bar */}
        <div style={{ marginBottom: 16 }}>
          <div className="flex items-center justify-between mb-1.5" style={{ fontSize: 12 }}>
            <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Utilization</span>
            <span className="tnum" style={{ fontWeight: 700, color: utilization >= 70 ? "var(--ji-green)" : utilization >= 40 ? "var(--fund-amber)" : "var(--warn-red)" }}>
              {utilization}%
            </span>
          </div>
          <div className="alloc-track" style={{ height: 14 }}>
            <div style={{
              height: "100%", width: `${Math.min(100, utilization)}%`,
              background: utilization >= 70 ? "var(--ji-green)" : utilization >= 40 ? "var(--fund-amber)" : "var(--warn-red)",
              borderRadius: "var(--radius-sm)", transition: "width 0.3s ease",
            }} />
          </div>
          <div className="flex justify-between mt-1" style={{ fontSize: 11, color: "var(--text-muted)" }}>
            <span>{dashboard.productiveHrsPerDay.toFixed(1)}h productive/day</span>
            <span>{dashboard.productiveHrsPerWeek.toFixed(1)}h/week</span>
            <span>{dashboard.productiveHrsPerMonth.toFixed(0)}h/month</span>
          </div>
        </div>
      </div>

      {/* ── This Week Tracker + Job Preview ── */}
      <div className="panel-inset p-3" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          This Week
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>Hours Booked</label>
            <input
              type="number" min={0} step={0.5} value={hoursBooked}
              onChange={(e) => setHoursBooked(Math.max(0, Number(e.target.value)))}
              className="field-editable" style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>Revenue Booked ($)</label>
            <input
              type="number" min={0} step={50} value={revenueBooked}
              onChange={(e) => setRevenueBooked(Math.max(0, Number(e.target.value)))}
              className="field-editable" style={inputStyle}
            />
          </div>
          {hasJob && (
            <button onClick={handleAddJob} className="btn" style={{ fontSize: 11, padding: "7px 14px", whiteSpace: "nowrap" }}>
              + Add This Job ({jobHours.toFixed(1)}h, {fmt(jobRevenue)})
            </button>
          )}
          {hoursBooked > 0 && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Blended: <span className="tnum" style={{ fontWeight: 700, color: blendedRate >= dashboard.minShopRate ? "var(--ji-green)" : "var(--fund-amber)" }}>
                {fmt(blendedRate)}/hr
              </span>
              <span style={{ marginLeft: 6 }}>
                vs min {fmt(dashboard.minShopRate)}/hr
              </span>
            </div>
          )}
        </div>
      </div>

      {/* If You Take This Job — before/after */}
      {hasJob && (
        <div className="panel-inset p-3" style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--client-blue)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            If You Take This Job
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>NOW</div>
              {[
                { label: "Hours", value: `${hoursBooked}h` },
                { label: "Revenue", value: fmt(revenueBooked) },
                { label: "$/hr", value: fmt(blendedRate) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between tnum" style={{ fontSize: 12, padding: "2px 0" }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>
            <div style={{ borderLeft: "2px solid var(--client-blue)", paddingLeft: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--client-blue)", marginBottom: 6 }}>WITH THIS JOB</div>
              {[
                { label: "Hours", value: `${withHours.toFixed(1)}h`, delta: `+${jobHours.toFixed(1)}h` },
                { label: "Revenue", value: fmt(withRevenue), delta: `+${fmt(jobRevenue)}` },
                { label: "$/hr", value: fmt(withBlended), delta: withBlended >= blendedRate ? "^" : "v", isArrow: true },
              ].map(({ label, value, delta, isArrow }) => (
                <div key={label} className="flex justify-between tnum" style={{ fontSize: 12, padding: "2px 0" }}>
                  <span style={{ color: "var(--text-muted)" }}>{label}</span>
                  <span>
                    <span style={{ fontWeight: 600 }}>{value}</span>
                    {" "}
                    <span style={{ fontSize: 10, color: isArrow ? (withBlended >= blendedRate ? "var(--ji-green)" : "var(--warn-red)") : "var(--ji-green)" }}>
                      {delta}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Shop Settings (collapsed) ── */}
      <details style={{ marginTop: 4 }}>
        <summary style={summaryStyle}>
          Shop Settings
          <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 12, marginLeft: 8 }}>
            {fmt(monthlyCosts)}/mo, {impressionsPerHour} imp/hr, {utilization}% util, {targetMargin}% margin
          </span>
        </summary>
        <div style={{ padding: "16px 0 0" }}>

          {/* Monthly Costs */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--fund-amber)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Monthly Costs <span className="tnum" style={{ fontWeight: 600 }}>{fmt(monthlyCosts)}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
              {costItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                  <input
                    type="text" value={item.label} placeholder="Label"
                    onChange={(e) => updateCostItem(item.id, "label", e.target.value)}
                    className="field-editable"
                    style={{ flex: 1, padding: "5px 8px", fontSize: 12, minWidth: 0 }}
                  />
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--text-muted)", pointerEvents: "none" }}>$</span>
                    <input
                      type="number" min={0} step={50} value={item.amount}
                      onChange={(e) => updateCostItem(item.id, "amount", Math.max(0, Number(e.target.value)))}
                      className="field-editable tnum"
                      style={{ width: 100, padding: "5px 8px 5px 20px", fontSize: 12, textAlign: "right" }}
                    />
                  </div>
                  <button
                    onClick={() => removeCostItem(item.id)}
                    style={{
                      width: 22, height: 22, borderRadius: "50%", border: "1px solid var(--border-medium)",
                      background: "transparent", color: "var(--text-muted)", fontSize: 13, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}
                  >x</button>
                </div>
              ))}
            </div>
            <button onClick={addCostItem} className="btn" style={{ fontSize: 11, padding: "4px 12px", marginTop: 10 }}>
              + Add Cost Item
            </button>
          </div>

          {/* Production Capacity */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Production Capacity
            </div>
            <div className="flex flex-wrap gap-5">
              {[
                { label: "Impressions/hr", value: impressionsPerHour, set: setImpressionsPerHour, step: 50, min: 1 },
                { label: "Utilization %", value: utilization, set: setUtilization, step: 5, min: 1 },
                { label: "Hours/Day", value: hoursPerDay, set: setHoursPerDay, step: 0.5, min: 1 },
                { label: "Presses", value: numPresses, set: setNumPresses, step: 1, min: 1 },
                { label: "Days/Week", value: daysPerWeek, set: setDaysPerWeek, step: 1, min: 1 },
              ].map(({ label, value, set, step, min }) => (
                <div key={label}>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>{label}</label>
                  <input
                    type="number" min={min} step={step} value={value}
                    onChange={(e) => set(Math.max(min, Number(e.target.value)))}
                    className="field-editable" style={inputStyle}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Rates */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Rates
            </div>
            <div className="flex flex-wrap gap-5 mb-3">
              {[
                { label: "Admin ($/hr)", value: adminRate, set: setAdminRate },
                { label: "Artwork ($/hr)", value: artworkRate, set: setArtworkRate },
                { label: "Screens Up & Down ($/hr)", value: screensRate, set: setScreensRate },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>{label}</label>
                  <input
                    type="number" min={0} step={5} value={value}
                    onChange={(e) => set(Math.max(0, Number(e.target.value)))}
                    className="field-editable" style={inputStyle}
                  />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginBottom: 6 }}>Time per job (minutes)</div>
            <div className="flex flex-wrap gap-5">
              {[
                { label: "Admin", value: adminMinutes, set: setAdminMinutes },
                { label: "Artwork", value: artworkMinutes, set: setArtworkMinutes },
                { label: "Screens", value: screenMinutes, set: setScreenMinutes },
              ].map(({ label, value, set }) => (
                <div key={label}>
                  <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 4, fontWeight: 500 }}>{label}</label>
                  <input
                    type="number" min={0} step={5} value={value}
                    onChange={(e) => set(Math.max(0, Number(e.target.value)))}
                    className="field-editable" style={{ ...inputStyle, width: 70 }}
                  />
                </div>
              ))}
            </div>
            <div className="panel-inset p-2 mt-3" style={{ fontSize: 12, color: "var(--text-muted)" }}>
              Non-press cost per job: <span className="tnum" style={{ fontWeight: 700, color: "var(--text-primary)" }}>{fmt(dashboard.nonPressCostPerJob)}</span>
              <span style={{ marginLeft: 6 }}>({adminMinutes + artworkMinutes + screenMinutes} min total)</span>
            </div>
          </div>

          {/* Profitability Goal */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ji-green)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Profitability Goal
            </div>
            <div className="flex items-center gap-3">
              <label style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>Target Margin %</label>
              <input
                type="number" min={1} max={99} step={5} value={targetMargin}
                onChange={(e) => setTargetMargin(Math.max(1, Math.min(99, Number(e.target.value))))}
                className="field-editable" style={{ ...inputStyle, width: 70 }}
              />
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
