/**
 * SpeciesFrequencyChart.jsx — horizontal bar chart of top species by count.
 * Data: GET /api/runs/{id}/species-frequency
 */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

const COLOURS = [
  "#D4A24E", "#6B8F71", "#6B8FAA", "#C4623F",
  "#9AA093", "#B8956A", "#5C8F6B", "#8FAA6B",
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--surface-raised)", border: "1px solid var(--border)",
      padding: "8px 12px", borderRadius: "var(--radius-sm)",
    }}>
      <p style={{ fontFamily: "var(--font-display)", fontSize: "0.9rem" }}>
        {payload[0]?.payload?.common_name}
      </p>
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--accent-active)" }}>
        {payload[0]?.value} detections
      </p>
    </div>
  );
};

export default function SpeciesFrequencyChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📊</span>
        <p>No detections above threshold</p>
      </div>
    );
  }

  // Show top 15
  const topData = data.slice(0, 15);

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, topData.length * 36)}>
      <BarChart
        data={topData}
        layout="vertical"
        margin={{ top: 8, right: 32, bottom: 8, left: 160 }}
      >
        <XAxis type="number" tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--text-muted)" }} />
        <YAxis
          type="category"
          dataKey="common_name"
          width={155}
          tick={{ fontFamily: "var(--font-display)", fontSize: 13, fill: "var(--text)", fontStyle: "italic" }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="count" radius={[0, 3, 3, 0]}>
          {topData.map((_, i) => (
            <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
