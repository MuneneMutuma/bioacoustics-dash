/**
 * SpeciesCard.jsx — the central focus pane of the live dashboard.
 *
 * Shows:
 *  - Large serif common name
 *  - Italic scientific name
 *  - Confidence bar (colour-coded by score level)
 *  - Event state badge (START / UPDATE / END / NONE)
 *  - Run ID and timestamp
 *
 * Props:
 *   detection  — latest DetectionEvent dict or null
 *   runId      — current run ID string or null
 *   status     — 'live' | 'waiting' | 'offline'
 */
import styles from "./SpeciesCard.module.css";

const STATE_BADGE = {
  START:  "badge-start",
  UPDATE: "badge-update",
  END:    "badge-end",
  NONE:   "badge-none",
};

function ConfBar({ score }) {
  const pct = Math.min(100, Math.round(score * 100));
  const cls = score >= 0.65 ? "high" : score >= 0.3 ? "" : "low";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span className="text-xs text-muted font-mono">Confidence</span>
        <span className="text-xs font-mono" style={{
          color: score >= 0.65 ? "var(--accent-active)" :
                 score >= 0.3  ? "var(--accent-confidence)" :
                                 "var(--accent-alert)"
        }}>
          {pct}%
        </span>
      </div>
      <div className="conf-track">
        <div className={`conf-fill ${cls}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SpeciesCard({ detection, runId, connectionStatus }) {
  const statusDot = connectionStatus === "live"    ? "dot-live"
                  : connectionStatus === "waiting" ? "dot-waiting"
                  :                                  "dot-offline";

  const statusLabel = connectionStatus === "live"    ? "Live"
                    : connectionStatus === "waiting" ? "Connecting…"
                    :                                  "Disconnected";

  return (
    <div className={styles.card}>
      {/* Connection status */}
      <div className={styles.statusBar}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span className={`dot ${statusDot}`} />
          <span className="text-xs font-mono text-muted">{statusLabel}</span>
        </div>
        {runId && (
          <span className="text-xs font-mono text-faint">{runId}</span>
        )}
      </div>

      {detection ? (
        <>
          {/* Species identity */}
          <div className={styles.identity}>
            <h1 className="species-name">{detection.common_name}</h1>
            <p className="species-scientific">{detection.scientific_name || "—"}</p>
          </div>

          {/* Event state badge */}
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

          {/* Confidence bar */}
          <div className={styles.conf}>
            <ConfBar score={parseFloat(detection.score || 0)} />
          </div>

          {/* Timestamp */}
          <div className={styles.meta}>
            <span className="text-xs font-mono text-faint">{detection.timestamp_utc}</span>
            <span className="text-xs font-mono text-faint">
              {detection.latency_ms ? `${parseFloat(detection.latency_ms).toFixed(0)} ms` : ""}
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
  );
}
