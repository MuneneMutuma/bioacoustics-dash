/**
 * DetectionTimeline.jsx — detections per hour, grouped by species.
 * Data: GET /api/runs/{id}/timeline
 * Renders as a stacked bar chart (hour × species counts).
 */
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import { useMemo } from "react";

const COLOURS = [
  "#D4A24E", "#6B8F71", "#6B8FAA", "#C4623F",
  "#9AA093", "#B8956A", "#5C8F6B", "#8FAA6B",
  "#AA6B8F", "#6BAA8F",
];

export default function DetectionTimeline({ data = [] }) {
  const { pivoted, species } = useMemo(() => {
    if (!data.length) return { pivoted: [], species: [] };

    // Pivot: one row per hour, one column per species
    const hourMap = {};
    const speciesSet = new Set();

    for (const row of data) {
      const h = row.hour?.substring(0, 16) || row.hour || "?"; // shorten to HH:MM
      speciesSet.add(row.common_name);
      if (!hourMap[h]) hourMap[h] = { hour: h };
      hourMap[h][row.common_name] = (hourMap[h][row.common_name] || 0) + row.count;
    }

    return {
      pivoted: Object.values(hourMap).sort((a, b) => a.hour.localeCompare(b.hour)),
      species: [...speciesSet].slice(0, 10),
    };
  }, [data]);

  if (!pivoted.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📅</span>
        <p>No timeline data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={340}>
      <BarChart data={pivoted} margin={{ top: 8, right: 16, bottom: 48, left: 8 }}>
        <XAxis
          dataKey="hour"
          tick={{ fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--text-muted)" }}
          angle={-45}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--text-muted)" }} />
        <Tooltip
          contentStyle={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          }}
        />
        <Legend
          wrapperStyle={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 12 }}
        />
        {species.map((s, i) => (
          <Bar key={s} dataKey={s} stackId="a" fill={COLOURS[i % COLOURS.length]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
