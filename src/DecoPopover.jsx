import { useRef, useEffect } from "react";
import {
  DECO_TYPES,
  DECO_TYPE_COLORS,
  SP_COST_PARAMS,
  locationToDtfPreset,
} from "./decoCostEstimator";
import { EMB_STITCH_TIERS } from "./embroideryData";
import { DTF_SIZE_PRESETS } from "./dtfPricing";

const EMB_GROUPS = [
  { label: "LIGHT", tiers: [0, 1, 2, 3, 4, 5] },
  { label: "MEDIUM", tiers: [6, 7, 8, 9, 10, 11] },
  { label: "HEAVY", tiers: [12, 13, 14, 15, 16, 17] },
];

const fmt = (v) => "$" + v.toFixed(2);

/* ── Tab Bar ── */
function TabBar({ activeType, onTypeChange }) {
  return (
    <div className="deco-tab-bar">
      {DECO_TYPES.map((dt) => {
        const active = activeType === dt.key;
        const color = DECO_TYPE_COLORS[dt.key];
        return (
          <button
            key={dt.key}
            className={`deco-tab${active ? " deco-tab--active" : ""}`}
            style={active ? { borderTopColor: color, background: "var(--bg-panel)" } : undefined}
            onClick={() => onTypeChange(dt.key)}
          >
            {dt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── SP: Screen Pills ── */
function SPControls({ param, totalQty, typeColor, effectiveCogs, onParamChange }) {
  const screenIdx = Math.max(0, Math.min(5, (param || 1) - 1));
  const { setup, variable } = SP_COST_PARAMS[screenIdx];
  const effectiveAmort = Math.max(totalQty, 12);

  return (
    <div>
      <div className="deco-section-label">SCREENS</div>
      <div className="deco-screen-row">
        {[1, 2, 3, 4, 5, 6].map((n) => {
          const active = param === n;
          return (
            <button
              key={n}
              className="deco-screen-pill"
              data-active={active || undefined}
              style={active ? {
                background: `rgba(${hexToRgb(typeColor)}, 0.15)`,
                borderColor: typeColor,
                color: typeColor,
              } : undefined}
              onClick={() => onParamChange(n)}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="deco-formula">
        ${setup.toFixed(2)} setup &divide; {effectiveAmort} + ${variable.toFixed(4)}/ea
      </div>
    </div>
  );
}

/* ── EMB: Stitch Tier Groups ── */
function EMBControls({ param, typeColor, effectiveCogs, item, onParamChange }) {
  const tierIdx = param ?? 5;

  return (
    <div>
      {EMB_GROUPS.map((group) => (
        <div key={group.label} className="deco-stitch-group">
          <div className="deco-section-label" style={{ marginBottom: 2 }}>{group.label}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {group.tiers.map((ti) => {
              const tier = EMB_STITCH_TIERS[ti];
              if (!tier) return null;
              const active = tierIdx === ti;
              return (
                <button
                  key={ti}
                  className="deco-stitch-pill"
                  data-active={active || undefined}
                  style={active ? {
                    background: `rgba(${hexToRgb(typeColor)}, 0.15)`,
                    borderColor: typeColor,
                    color: typeColor,
                  } : undefined}
                  onClick={() => onParamChange(ti)}
                >
                  {tier.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── DTF: Auto-mapped Info Card ── */
function DTFInfo({ location, param }) {
  const presetKey = locationToDtfPreset(location);
  const preset = DTF_SIZE_PRESETS.find((p) => p.key === presetKey);
  const label = preset ? preset.label : "Standard";
  const dims = preset ? `${preset.w}"×${preset.h}"` : '10"×10"';
  const cost = preset ? fmt(preset.cost) : "$3.50";

  return (
    <div className="deco-dtf-card">
      <span style={{ opacity: 0.5, marginRight: 4 }}>AUTO &rarr;</span>
      {label} {dims} &middot; {cost}
    </div>
  );
}

/* ── Custom: Manual COGS Input ── */
function CustomInput({ item, onCogsChange }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  return (
    <div>
      <div className="deco-section-label">MANUAL COGS</div>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)",
          fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700,
          color: "var(--text-muted)", pointerEvents: "none",
        }}>$</span>
        <input
          ref={inputRef}
          type="number"
          value={item.decoCogs}
          onChange={(e) => onCogsChange(item.id, parseFloat(e.target.value) || 0)}
          step={0.01}
          min={0}
          className="deco-custom-input"
        />
      </div>
      <div className="deco-formula">Enter your known cost per unit</div>
    </div>
  );
}

/* ── COGS Footer ── */
function CogsFooter({ decoType, effectiveCogs, cogsTooltip, typeColor, onOverrideCustom }) {
  const isCustom = decoType === "custom";

  return (
    <div className="deco-cogs-footer">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="deco-cogs-footer__label">EST. COGS</span>
        <span
          className="deco-cogs-footer__value"
          style={{ color: typeColor }}
        >
          {fmt(effectiveCogs)}
        </span>
      </div>
      {!isCustom && cogsTooltip && (
        <div className="deco-formula" style={{ marginTop: 2 }}>{cogsTooltip}</div>
      )}
      {!isCustom && (
        <button className="deco-override-link" onClick={onOverrideCustom}>
          Override with custom value
        </button>
      )}
    </div>
  );
}

/* ── Hex to RGB helper ── */
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return `${parseInt(h.substring(0, 2), 16)}, ${parseInt(h.substring(2, 4), 16)}, ${parseInt(h.substring(4, 6), 16)}`;
}

/* ── Main DecoPopover ── */
export default function DecoPopover({
  item,
  effectiveCogs,
  cogsTooltip,
  totalQty,
  onTypeChange,
  onParamChange,
  onCogsChange,
  onOverrideCustom,
  onClose,
}) {
  const typeColor = DECO_TYPE_COLORS[item.decoType] || DECO_TYPE_COLORS.custom;

  return (
    <div className="deco-popover" style={{ overflow: "hidden" }}>
      <TabBar
        activeType={item.decoType}
        onTypeChange={(type) => onTypeChange(item.id, type)}
      />

      {/* Content area with type-color accent border */}
      <div className="deco-content" style={{ borderTopColor: typeColor }} key={item.decoType}>
        {/* Type-specific controls */}
        {item.decoType === "sp" && (
          <SPControls
            param={item.decoParam}
            totalQty={totalQty}
            typeColor={typeColor}
            effectiveCogs={effectiveCogs}
            onParamChange={(v) => onParamChange(item.id, v)}
          />
        )}

        {item.decoType === "emb" && (
          <EMBControls
            param={item.decoParam}
            typeColor={typeColor}
            effectiveCogs={effectiveCogs}
            item={item}
            onParamChange={(v) => onParamChange(item.id, v)}
          />
        )}

        {item.decoType === "dtf" && (
          <DTFInfo location={item.location} param={item.decoParam} />
        )}

        {(item.decoType === "custom" || !item.decoType) && (
          <CustomInput item={item} onCogsChange={onCogsChange} />
        )}
      </div>

      {/* Footer */}
      <CogsFooter
        decoType={item.decoType}
        effectiveCogs={effectiveCogs}
        cogsTooltip={cogsTooltip}
        typeColor={typeColor}
        onOverrideCustom={() => onOverrideCustom(item.id)}
      />
    </div>
  );
}

