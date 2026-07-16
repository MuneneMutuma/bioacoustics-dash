/**
 * ConfidenceHistogram.jsx — distribution of confidence scores.
 * Data: GET /api/runs/{id}/confidence
 */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell,
} from "recharts";

const thresholds = [
  { value: 0.30, label: "print (0.30)", stroke: "#9AA093" },
  { value: 0.65, label: "event (0.65)", stroke: "#D4A24E" },
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{
      background: "var(--surface-raised)", border: "1px solid var(--border)",
      padding: "8px 12px", borderRadius: "var(--radius-sm)",
      fontFamily: "var(--font-mono)", fontSize: "0.8rem",
    }}>
      <p>{d?.bin_start?.toFixed(2)} – {d?.bin_end?.toFixed(2)}</p>
      <p style={{ color: "var(--accent-active)" }}>{d?.count} detections</p>
    </div>
  );
};

export default function ConfidenceHistogram({ data = [] }) {
  if (!data.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📈</span>
        <p>No confidence data</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <XAxis
          dataKey="bin_start"
          tickFormatter={(v) => v.toFixed(1)}
          tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--text-muted)" }}
        />
        <YAxis tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--text-muted)" }} />
        <Tooltip content={<CustomTooltip />} />
        {thresholds.map((t) => (
          <ReferenceLine
            key={t.label}
            x={t.value}
            stroke={t.stroke}
            strokeDasharray="4 2"
            label={{ value: t.label, fill: t.stroke, fontSize: 10, fontFamily: "var(--font-mono)" }}
          />
        ))}
        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={
                d.bin_start >= 0.65 ? "#D4A24E" :
                d.bin_start >= 0.30 ? "#6B8F71" :
                "#3A4239"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
