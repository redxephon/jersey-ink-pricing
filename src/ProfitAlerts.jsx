import { fmt } from "./fmt";

export default function ProfitAlerts({ dollarsPerHour, targetHourlyRate, setTargetHourlyRate, minProfitableQty, currentQty, currentHourlyEarning }) {
  const gap = dollarsPerHour - targetHourlyRate;
  const isAboveTarget = gap >= 0;
  const showMinOrder = minProfitableQty !== null && currentQty < minProfitableQty;

  return (
    <div className="flex flex-col gap-2 mt-3">
      {/* Opportunity Cost */}
      <div
        className={isAboveTarget ? "alert-info" : "alert-warn"}
        style={{ padding: "8px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}
      >
        <span style={{ fontWeight: 600 }}>
          This job: {fmt(dollarsPerHour)}/hr
        </span>
        <span style={{ opacity: 0.6 }}>|</span>
        <span>
          Target:
          <input
            type="number"
            min={0}
            step={5}
            value={targetHourlyRate}
            onChange={(e) => setTargetHourlyRate(Math.max(0, Number(e.target.value)))}
            className="field-editable"
            style={{
              width: 56, padding: "2px 4px", textAlign: "center", fontSize: 12,
              fontWeight: 600, marginLeft: 4, marginRight: 2,
              borderColor: "transparent", background: "var(--bg-surface)",
            }}
          />
          /hr
        </span>
        <span style={{ opacity: 0.6 }}>|</span>
        <span style={{ fontWeight: 600 }}>
          {isAboveTarget ? "+" : ""}{fmt(gap)}/hr {isAboveTarget ? "above target" : "below target"}
        </span>
      </div>

      {/* Minimum Order Profitability */}
      {showMinOrder && (
        <div
          className="alert-danger"
          style={{ padding: "8px 12px", fontSize: 12 }}
        >
          <span style={{ fontWeight: 600 }}>
            At {currentQty} pcs you earn {fmt(currentHourlyEarning)}/hr.
          </span>
          {" "}
          Need <span style={{ fontWeight: 700 }}>{minProfitableQty}+</span> to hit {fmt(targetHourlyRate)}/hr target.
        </div>
      )}
    </div>
  );
}
