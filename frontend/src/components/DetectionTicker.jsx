/**
 * DetectionTicker.jsx — the left-rail running log.
 *
 * Shows the last N inference rows in monospace, newest at top.
 * Each new row flashes amber, then fades to the muted text colour.
 * Rows above the print_threshold are highlighted slightly.
 */
import { useRef, useEffect } from "react";
import styles from "./DetectionTicker.module.css";

function formatTime(iso) {
  if (!iso) return "--:--:--";
  const d = new Date(iso);
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

function scoreClass(score) {
  const s = parseFloat(score);
  if (s >= 0.65) return "high";
  if (s >= 0.30) return "mid";
  return "low";
}

export default function DetectionTicker({ rows = [] }) {
  const topRef = useRef(null);

  // Scroll to top on new detection
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rows.length]);

  if (rows.length === 0) {
    return (
      <div className={styles.empty}>
        <span className="text-faint font-mono text-xs">Awaiting detections…</span>
      </div>
    );
  }

  return (
    <div className={styles.ticker} aria-label="Detection log">
      <div ref={topRef} />
      {rows.map((row, i) => (
        <div
          key={`${row.timestamp_utc}-${i}`}
          className={`log-row ${styles.row} ${i === 0 ? styles.rowNew : ""} ${styles[scoreClass(row.score)] || ""}`}
        >
          <span className={styles.time}>{formatTime(row.timestamp_utc)}</span>
          <span className={styles.species}>{row.common_name || "—"}</span>
          <span className={`${styles.score} ${styles["score_" + scoreClass(row.score)]}`}>
            {parseFloat(row.score || 0).toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}
