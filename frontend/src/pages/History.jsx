/**
 * History.jsx — run selector / history browser.
 *
 * Fetches the list of all run IDs, displays them as cards with metadata,
 * and navigates to RunDetail on click.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRuns, fetchRunDetail } from "../api/client.js";
import styles from "./History.module.css";

function formatRunId(id) {
  // "20260528_122209_utc" → "2026-05-28  12:22:09 UTC"
  const m = id.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_utc$/);
  if (!m) return id;
  return `${m[1]}-${m[2]}-${m[3]}  ${m[4]}:${m[5]}:${m[6]} UTC`;
}

function RunCard({ runId, onClick }) {
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    fetchRunDetail(runId)
      .then(setDetail)
      .catch(() => {});
  }, [runId]);

  return (
    <button className={styles.card} onClick={onClick} id={`run-${runId}`}>
      <div className={styles.cardId}>{formatRunId(runId)}</div>
      <div className={styles.cardMeta}>
        {detail ? (
          <>
            {detail.inference_row_count != null && (
              <span className="badge badge-none">{detail.inference_row_count.toLocaleString()} inferences</span>
            )}
            {detail.has_events  && <span className="badge badge-none">events</span>}
            {detail.has_profile && <span className="badge badge-none">profile</span>}
          </>
        ) : (
          <span className="text-xs font-mono text-faint">Loading…</span>
        )}
      </div>
      <span className={styles.arrow}>→</span>
    </button>
  );
}

export default function History() {
  const [runs, setRuns]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const navigate              = useNavigate();

  useEffect(() => {
    fetchRuns()
      .then(setRuns)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Recording History</h1>
        <p className={styles.subtitle}>
          Select a run to view species frequency, detection timeline, confidence distribution, and system profiling.
        </p>
      </div>

      {loading && (
        <div className="empty-state">
          <div className="dot dot-waiting" style={{ width: 12, height: 12 }} />
          <p className="text-muted font-mono text-sm">Loading runs…</p>
        </div>
      )}

      {error && (
        <div className="empty-state">
          <span className="empty-icon">⚠️</span>
          <p className="text-alert">{error}</p>
          <p className="text-xs text-faint font-mono">Is the backend running?</p>
        </div>
      )}

      {!loading && !error && runs.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📂</span>
          <p className="text-muted">No runs found</p>
          <p className="text-xs text-faint font-mono">
            Point PERCH_RUNS_DIR at a directory containing run folders.
          </p>
        </div>
      )}

      <div className={styles.list}>
        {runs.map((runId) => (
          <RunCard
            key={runId}
            runId={runId}
            onClick={() => navigate(`/history/${runId}`)}
          />
        ))}
      </div>
    </div>
  );
}
