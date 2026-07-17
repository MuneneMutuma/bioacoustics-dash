/**
 * TopDetectionsChart.jsx — Top N highest confidence detections.
 * Data: GET /api/runs/{id}/top-detections
 * Shows a scatter plot of top individual detections (Time vs Confidence Score).
 */
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, Legend,
  ResponsiveContainer, Cell, CartesianGrid
} from "recharts";
import { useMemo } from "react";

const COLOURS = [
  "#D4A24E", "#6B8F71", "#6B8FAA", "#C4623F",
  "#9AA093", "#B8956A", "#5C8F6B", "#8FAA6B",
  "#AA6B8F", "#6BAA8F",
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: "var(--surface-raised)", border: "1px solid var(--border)",
      padding: "8px 12px", borderRadius: "var(--radius-sm)",
      fontFamily: "var(--font-mono)", fontSize: "0.8rem",
      boxShadow: "var(--shadow-md)"
    }}>
      <p style={{ fontFamily: "var(--font-display)", fontSize: "0.95rem", fontStyle: "italic", marginBottom: "4px" }}>
        {d.common_name}
      </p>
      <p><span className="text-muted">Time:</span> {d.time}</p>
      <p><span className="text-muted">Score:</span> <span style={{ color: "var(--accent-active)" }}>{d.score.toFixed(3)}</span></p>
    </div>
  );
};

export default function TopDetectionsChart({ data = [] }) {
  const { plotData, species } = useMemo(() => {
    if (!data.length) return { plotData: [], species: [] };

    const speciesSet = new Set();
    const mapped = data.map(d => {
      speciesSet.add(d.common_name);
      return {
        ...d,
        time: d.timestamp_utc?.substring(11, 19) || "?"
      };
    }).sort((a, b) => a.time.localeCompare(b.time));

    return { plotData: mapped, species: [...speciesSet] };
  }, [data]);

  if (!plotData.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">⭐</span>
        <p>No high-confidence detections found</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={600}>
      <ScatterChart margin={{ top: 24, right: 32, bottom: 24, left: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          type="category"
          dataKey="time"
          name="Time"
          allowDuplicatedCategory={false}
          tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--text-muted)" }}
        />
        <YAxis
          type="number"
          dataKey="score"
          name="Confidence Score"
          domain={[0, 1.0]}
          tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--text-muted)" }}
        />
        <ZAxis type="number" range={[100, 100]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 12 }} />
        
        {species.map((sp, i) => (
          <Scatter key={sp} name={sp} data={plotData.filter(d => d.common_name === sp)} fill={COLOURS[i % COLOURS.length]} opacity={0.8} />
        ))}
      </ScatterChart>
    </ResponsiveContainer>
  );
}
