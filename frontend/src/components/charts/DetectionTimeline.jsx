/**
 * DetectionTimeline.jsx — Custom SVG heatmap timeline.
 *
 * Y-axis: top-15 species sorted by total count (categorical)
 * X-axis: real UTC time, fully dynamic range (adapts from minutes to hours)
 * Each bubble = one 5-min bucket; radius ∝ log(count)
 * Hover = tooltip with species, exact time, count
 */
import { useMemo, useRef, useEffect, useState } from "react";

const COLOURS = [
  "#D4A24E","#6B8F71","#6B8FAA","#C4623F",
  "#9AA093","#B8956A","#5C8F6B","#8FAA6B",
  "#AA6B8F","#6BAA8F","#D47A4E","#7A6BAA",
  "#71A08F","#AA8F6B","#6BAA71",
];

const MARGIN = { top: 16, right: 48, bottom: 64, left: 180 };
const ROW_H  = 38;

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtTick(ms, rangeMs) {
  const d = new Date(ms);
  if (rangeMs <= 2   * 60 * 1000) return `${String(d.getUTCMinutes()).padStart(2,"0")}:${String(d.getUTCSeconds()).padStart(2,"0")}`;
  if (rangeMs <= 120 * 60 * 1000) return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
  return `${String(d.getUTCHours()).padStart(2,"0")}h`;
}

function niceTicks(minMs, maxMs, count = 6) {
  const range = maxMs - minMs;
  const step  = range / (count - 1);
  return Array.from({ length: count }, (_, i) => minMs + i * step);
}

function bubbleRadius(count, maxCount) {
  // log-scale radius: min 5, max 22
  const t = Math.log1p(count) / Math.log1p(maxCount);
  return 5 + t * 17;
}

// ── Tooltip ────────────────────────────────────────────────────────────────

function Tooltip({ d, x, y, visible }) {
  if (!visible || !d) return null;
  const ts = new Date(d.ts).toISOString().replace("T", " ").substring(0, 19) + " UTC";
  return (
    <foreignObject x={x + 8} y={Math.max(0, y - 60)} width={220} height={100} style={{ pointerEvents: "none", overflow: "visible" }}>
      <div style={{
        background: "var(--surface-raised)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "8px 12px",
        fontFamily: "var(--font-mono)",
        fontSize: "0.78rem",
        boxShadow: "var(--shadow-md)",
        color: "var(--text)",
        width: "max-content",
        maxWidth: 220,
      }}>
        <div style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: "0.92rem", marginBottom: 4, color: "var(--text)" }}>
          {d.common_name}
        </div>
        <div style={{ color: "var(--text-faint)" }}>{ts}</div>
        <div style={{ marginTop: 2 }}>
          Count: <span style={{ color: "var(--accent-active)", fontWeight: 700 }}>{d.count}</span>
        </div>
      </div>
    </foreignObject>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function DetectionTimeline({ data = [] }) {
  const containerRef = useRef(null);
  const [width, setWidth]     = useState(900);
  const [hovered, setHovered] = useState(null); // { d, svgX, svgY }

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const { rows, speciesList, minTs, maxTs, rangeMs, maxCount, colorMap } = useMemo(() => {
    if (!data.length) return { rows: [], speciesList: [], minTs: 0, maxTs: 0, rangeMs: 1, maxCount: 1, colorMap: {} };

    // Parse ISO timestamps → epoch ms
    const parsed = data.map(row => {
      const ts = new Date(row.hour).getTime();
      return { ...row, ts: isNaN(ts) ? null : ts };
    }).filter(r => r.ts != null);

    if (!parsed.length) return { rows: [], speciesList: [], minTs: 0, maxTs: 0, rangeMs: 1, maxCount: 1, colorMap: {} };

    // Sort species by total count desc
    const totals = {};
    for (const r of parsed) totals[r.common_name] = (totals[r.common_name] || 0) + r.count;
    const speciesList = Object.entries(totals).sort((a,b) => b[1]-a[1]).slice(0,15).map(([s]) => s);
    const colorMap = Object.fromEntries(speciesList.map((s,i) => [s, COLOURS[i % COLOURS.length]]));

    const rows = parsed.filter(r => speciesList.includes(r.common_name));
    const allTs = rows.map(r => r.ts);
    const minTs = Math.min(...allTs);
    const maxTs = Math.max(...allTs);
    const rangeMs = (maxTs - minTs) || (5 * 60 * 1000); // default 5-min if single point
    const maxCount = Math.max(...rows.map(r => r.count), 1);

    return { rows, speciesList, minTs, maxTs, rangeMs, maxCount, colorMap };
  }, [data]);

  if (!rows.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📅</span>
        <p>No timeline data available</p>
      </div>
    );
  }

  // Chart dimensions
  const chartW = Math.max(0, width - MARGIN.left - MARGIN.right);
  const chartH = speciesList.length * ROW_H;
  const svgH   = chartH + MARGIN.top + MARGIN.bottom;

  // Scales
  const padding = rangeMs * 0.04;
  const domainMin = minTs - padding;
  const domainMax = maxTs + padding;
  const domainRange = domainMax - domainMin;

  const xPos = (ts) => ((ts - domainMin) / domainRange) * chartW;
  const yPos = (sp) => {
    const idx = speciesList.indexOf(sp);
    return idx * ROW_H + ROW_H / 2;
  };

  const ticks = niceTicks(minTs, maxTs, Math.min(8, Math.max(4, Math.floor(chartW / 90))));

  return (
    <div ref={containerRef} style={{ width: "100%" }}>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.72rem", color: "var(--text-faint)", margin: "8px 0 4px 12px" }}>
        Bubble size = detection count per 5-min bucket · Hover for details
      </p>
      <svg
        width={width}
        height={svgH}
        style={{ display: "block", overflow: "visible" }}
        onMouseLeave={() => setHovered(null)}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>

          {/* ── Horizontal grid lines & Y-axis labels ── */}
          {speciesList.map((sp, i) => {
            const y = yPos(sp);
            return (
              <g key={sp}>
                <line
                  x1={0} y1={y} x2={chartW} y2={y}
                  stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3"
                />
                <text
                  x={-10} y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 13, fill: "var(--text)" }}
                >
                  {sp}
                </text>
              </g>
            );
          })}

          {/* ── X-axis ticks ── */}
          {ticks.map(ts => {
            const x = xPos(ts);
            const label = fmtTick(ts, rangeMs);
            return (
              <g key={ts}>
                <line x1={x} y1={0} x2={x} y2={chartH} stroke="var(--border)" strokeWidth={1} strokeDasharray="3 3" />
                <line x1={x} y1={chartH} x2={x} y2={chartH + 6} stroke="var(--border-light)" strokeWidth={1} />
                <text
                  x={x} y={chartH + 22}
                  textAnchor="middle"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--text-muted)" }}
                >
                  {label}
                </text>
              </g>
            );
          })}

          {/* ── X-axis baseline ── */}
          <line x1={0} y1={chartH} x2={chartW} y2={chartH} stroke="var(--border-light)" strokeWidth={1.5} />

          {/* ── X-axis label ── */}
          <text
            x={chartW / 2} y={chartH + 48}
            textAnchor="middle"
            style={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--text-faint)" }}
          >
            UTC Time →
          </text>

          {/* ── Bubbles ── */}
          {rows.map((d, i) => {
            const x = xPos(d.ts);
            const y = yPos(d.common_name);
            const r = bubbleRadius(d.count, maxCount);
            const color = colorMap[d.common_name] || "#888";
            const isHov = hovered?.d === d;
            return (
              <circle
                key={i}
                cx={x} cy={y} r={r}
                fill={color}
                fillOpacity={isHov ? 1 : 0.78}
                stroke={isHov ? "var(--text)" : color}
                strokeWidth={isHov ? 2 : 0.5}
                strokeOpacity={0.5}
                style={{ cursor: "pointer", transition: "fill-opacity 0.1s, r 0.1s" }}
                onMouseEnter={(e) => {
                  const svgRect = e.currentTarget.closest("svg").getBoundingClientRect();
                  setHovered({ d, svgX: x, svgY: y });
                }}
              />
            );
          })}

          {/* ── Tooltip ── */}
          {hovered && (
            <Tooltip
              d={hovered.d}
              x={Math.min(hovered.svgX, chartW - 240)}
              y={hovered.svgY}
              visible={true}
            />
          )}

        </g>
      </svg>
    </div>
  );
}
