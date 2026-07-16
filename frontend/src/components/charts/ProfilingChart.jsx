/**
 * ProfilingChart.jsx — system resource usage over a run.
 * Data: GET /api/runs/{id}/profile
 * Shows CPU%, RAM%, and load average as a multi-line chart.
 */
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

export default function ProfilingChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🖥️</span>
        <p>No profiling data</p>
      </div>
    );
  }

  // Downsample to max 300 points for render performance
  const step = Math.max(1, Math.floor(data.length / 300));
  const sampled = data.filter((_, i) => i % step === 0);

  const tickStyle = { fontFamily: "var(--font-mono)", fontSize: 10, fill: "var(--text-muted)" };

  return (
    <ResponsiveContainer width="100%" height={340}>
      <LineChart data={sampled} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <XAxis
          dataKey="timestamp_utc"
          tickFormatter={(v) => v?.substring(11, 16) || ""}
          tick={tickStyle}
          interval={Math.floor(sampled.length / 8)}
        />
        <YAxis tick={tickStyle} domain={[0, 100]} unit="%" />
        <Tooltip
          contentStyle={{
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
          }}
          labelFormatter={(v) => v?.substring(11, 19) || v}
        />
        <Legend wrapperStyle={{ fontFamily: "var(--font-mono)", fontSize: 11 }} />
        <Line
          type="monotone"
          dataKey="proc_cpu_percent"
          name="Proc CPU"
          stroke="#D4A24E"
          dot={false}
          strokeWidth={1.5}
        />
        <Line
          type="monotone"
          dataKey="system_cpu_percent"
          name="Sys CPU"
          stroke="#6B8FAA"
          dot={false}
          strokeWidth={1.5}
        />
        <Line
          type="monotone"
          dataKey="system_ram_percent"
          name="RAM"
          stroke="#6B8F71"
          dot={false}
          strokeWidth={1.5}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
