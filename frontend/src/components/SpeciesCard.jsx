/**
 * SpeciesCard.jsx — the central focus pane of the live dashboard.
 *
 * Left column: identity (name, scientific, badge, confidence, timestamp)
 * Right column: live session stats (total detections, species count, event activity)
 *
 * Props:
 *   detection        — latest DetectionEvent dict or null
 *   runId            — current run ID string or null
 *   connectionStatus — 'live' | 'waiting' | 'offline'
 *   rows             — all detection rows in the session (for stats)
 */
import { useMemo } from "react";
import styles from "./SpeciesCard.module.css";

const STATE_BADGE = {
  START:  "badge-start",
  UPDATE: "badge-update",
  END:    "badge-end",
  NONE:   "badge-none",
};

function ConfBar({ score }) {
  const pct = Math.min(100, Math.round(score * 100));
  const cls  = score >= 0.65 ? "high" : score >= 0.3 ? "" : "low";
  const col  = score >= 0.65 ? "var(--accent-active)"
             : score >= 0.3  ? "var(--accent-confidence)"
             :                  "var(--accent-alert)";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span className="text-xs text-muted font-mono">Confidence</span>
        <span className="text-xs font-mono bold" style={{ color: col }}>{pct}%</span>
      </div>
      <div className="conf-track" style={{ height: 8 }}>
        <div className={`conf-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatBlock({ label, value, sub, accent }) {
  return (
    <div className={styles.statBlock}>
      <div className={styles.statValue} style={accent ? { color: accent } : {}}>
        {value}
      </div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

export default function SpeciesCard({ detection, runId, connectionStatus, rows = [] }) {
  const statusDot   = connectionStatus === "live"    ? "dot-live"
                    : connectionStatus === "waiting" ? "dot-waiting"
                    :                                  "dot-offline";
  const statusLabel = connectionStatus === "live"    ? "Live"
                    : connectionStatus === "waiting" ? "Connecting…"
                    :                                  "Disconnected";

  // Compute live session stats from the rows buffer
  const stats = useMemo(() => {
    if (!rows.length) return null;
    const speciesSet = new Set(rows.map(r => r.common_name).filter(Boolean));
    const highConf   = rows.filter(r => parseFloat(r.score) >= 0.65);
    const scores     = rows.map(r => parseFloat(r.score)).filter(s => !isNaN(s));
    const avgScore   = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    // Count distinct event_ids
    const events     = new Set(rows.map(r => r.event_id).filter(e => e != null && e !== ""));
    return {
      total: rows.length,
      species: speciesSet.size,
      highConf: highConf.length,
      avgScore,
      events: events.size,
    };
  }, [rows]);

  return (
    <div className={styles.card}>
      {/* Connection status bar */}
      <div className={styles.statusBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className={`dot ${statusDot}`} />
          <span className="text-xs font-mono text-muted">{statusLabel}</span>
        </div>
        {runId && (
          <span className="text-xs font-mono text-faint">{runId}</span>
        )}
      </div>

      <div className={styles.body}>
        {/* ── Left: current detection identity ── */}
        <div className={styles.left}>
          {detection ? (
            <>
              <div className={styles.identity}>
                <h1 className="species-name">{detection.common_name}</h1>
                <p className="species-scientific">{detection.scientific_name || "—"}</p>
              </div>

              {detection.event_state && detection.event_state !== "NONE" && (
                <div className={styles.badgeRow}>
                  <span className={`badge ${STATE_BADGE[detection.event_state] || "badge-none"}`}>
                    {detection.event_state}
                  </span>
                  {detection.event_id && (
                    <span className="text-xs font-mono text-faint">event #{detection.event_id}</span>
                  )}
                </div>
              )}

              <div className={styles.conf}>
                <ConfBar score={parseFloat(detection.score || 0)} />
              </div>

              <div className={styles.meta}>
                <span className="text-xs font-mono text-faint">
                  {detection.timestamp_utc?.substring(11, 19)} UTC
                </span>
                <span className="text-xs font-mono text-faint">
                  {detection.latency_ms
                    ? `${parseFloat(detection.latency_ms).toFixed(0)} ms latency`
                    : ""}
                </span>
              </div>
            </>
          ) : (
            <div className={styles.waiting}>
              <div className={styles.waitIcon}>🎙️</div>
              <p className="text-muted" style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>
                Listening for birds…
              </p>
              <p className="text-xs text-faint font-mono">
                Detections will appear here as&nbsp;<em>inference.py</em>&nbsp;writes them.
              </p>
            </div>
          )}
        </div>

        {/* ── Right: live session stats panel ── */}
        <div className={styles.right}>
          <div className={styles.statsHeader}>Session Stats</div>
          {stats ? (
            <div className={styles.statsGrid}>
              <StatBlock
                label="Detections"
                value={stats.total.toLocaleString()}
              />
              <StatBlock
                label="Species"
                value={stats.species}
                accent="var(--accent-confidence)"
              />
              <StatBlock
                label="High Conf."
                value={stats.highConf}
                sub="≥ 65%"
                accent="var(--accent-active)"
              />
              <StatBlock
                label="Events"
                value={stats.events}
                accent="var(--accent-blue)"
              />
              <StatBlock
                label="Avg Score"
                value={`${Math.round(stats.avgScore * 100)}%`}
              />
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="text-xs font-mono text-faint">Awaiting data…</span>
            </div>
          )}

          {/* Recent species mini-list */}
          {rows.length > 0 && (
            <div className={styles.recentSpecies}>
              <div className={styles.statsHeader} style={{ marginBottom: 8 }}>Recently Detected</div>
              {[...new Set(rows.slice(0, 20).map(r => r.common_name).filter(Boolean))].slice(0, 6).map((sp, i) => {
                const latestRow = rows.find(r => r.common_name === sp);
                const sc = parseFloat(latestRow?.score || 0);
                const color = sc >= 0.65 ? "var(--accent-active)"
                            : sc >= 0.3  ? "var(--accent-confidence)"
                            :              "var(--text-faint)";
                return (
                  <div key={sp} className={styles.recentRow}>
                    <span className={styles.recentSpeciesName}>{sp}</span>
                    <span className={styles.recentScore} style={{ color }}>{Math.round(sc * 100)}%</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
