/**
 * RunDetail.jsx — analytics view for a single historical run.
 *
 * Five tabs, each loading its data on demand:
 *  1. Species Frequency   → /api/runs/{id}/species-frequency
 *  2. Timeline            → /api/runs/{id}/timeline
 *  3. Confidence          → /api/runs/{id}/confidence
 *  4. System Profile      → /api/runs/{id}/profile
 *  5. Top Detections      → /api/runs/{id}/top-detections
 *
 * Also shows the list of completed detection events.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SpeciesFrequencyChart from "../components/charts/SpeciesFrequencyChart.jsx";
import DetectionTimeline from "../components/charts/DetectionTimeline.jsx";
import ConfidenceHistogram from "../components/charts/ConfidenceHistogram.jsx";
import ProfilingChart from "../components/charts/ProfilingChart.jsx";
import TopDetectionsChart from "../components/charts/TopDetectionsChart.jsx";
import {
  fetchRuns, fetchSpeciesFrequency, fetchTimeline,
  fetchConfidence, fetchProfile, fetchEvents, fetchTopDetections, fetchEventDetections
} from "../api/client.js";
import styles from "./RunDetail.module.css";

const TABS = [
  { id: "species",    label: "Species Frequency" },
  { id: "timeline",   label: "Timeline" },
  { id: "confidence", label: "Confidence" },
  { id: "top",        label: "Top Detections" },
  { id: "profile",    label: "System Profile" },
  { id: "events",     label: "Events" },
];

function formatRunId(id) {
  const m = id.match(/^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})_utc$/);
  if (!m) return id;
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${m[6]} UTC`;
}

function useTabData(runId, tab) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setData(null); setError(null); setLoading(true);
    const fetchers = {
      species:    () => fetchSpeciesFrequency(runId),
      timeline:   () => fetchTimeline(runId),
      confidence: () => fetchConfidence(runId),
      profile:    () => fetchProfile(runId),
      events:     () => fetchEvents(runId),
      top:        () => fetchTopDetections(runId, 50, 0.5)
    };
    fetchers[tab]?.()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [runId, tab]);

  return { data, loading, error };
}

function EventRow({ e, runId }) {
  const [expanded, setExpanded] = useState(false);
  const [detections, setDetections] = useState(null);
  const [loadingDet, setLoadingDet] = useState(false);

  const toggle = () => {
    if (!expanded && detections === null) {
      setLoadingDet(true);
      fetchEventDetections(runId, e.event_id)
        .then(setDetections)
        .catch(() => setDetections([]))
        .finally(() => setLoadingDet(false));
    }
    setExpanded(v => !v);
  };

  const duration = ((new Date(e.end_utc) - new Date(e.start_utc)) / 1000).toFixed(1);

  return (
    <>
      <tr onClick={toggle} style={{ cursor: "pointer" }}>
        <td className="font-mono text-faint">
          <span style={{ display: "inline-block", width: 16 }}>{expanded ? "▼" : "▶"}</span>
          {e.event_id}
        </td>
        <td className="font-display" style={{ fontStyle: "italic", fontWeight: 500 }}>{e.peak_common_name}</td>
        <td className="font-mono" style={{
          color: e.peak_score >= 0.65 ? "var(--accent-active)" : "var(--accent-confidence)"
        }}>
          {parseFloat(e.peak_score).toFixed(3)}
        </td>
        <td className="font-mono text-xs text-muted">{e.start_utc?.substring(11, 19)}</td>
        <td className="font-mono text-xs text-muted">{e.end_utc?.substring(11, 19)}</td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={5} style={{ padding: 0 }}>
            <div style={{ background: "var(--surface-raised)", borderBottom: "1px solid var(--border)" }}>
              {/* Summary row */}
              <div style={{
                display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
                gap: 1, background: "var(--border)", borderBottom: "1px solid var(--border)"
              }}>
                {[{l:"Scientific", v: e.peak_scientific_name || "—", italic: true},
                  {l:"Duration",   v: `${duration}s`},
                  {l:"Peak Score", v: parseFloat(e.peak_score).toFixed(3), accent: "var(--accent-active)"},
                  {l:"Detections", v: detections ? detections.length : "…"}
                ].map(({l,v,accent,italic}) => (
                  <div key={l} style={{ background: "var(--surface-raised)", padding: "10px 14px" }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-faint)", marginBottom: 4 }}>{l}</div>
                    <div style={{ fontFamily: italic ? "var(--font-display)" : "var(--font-mono)", fontStyle: italic ? "italic" : "normal", fontSize: "0.9rem", color: accent || "var(--text-muted)" }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Per-detection breakdown */}
              {loadingDet && (
                <div style={{ padding: "16px", textAlign: "center" }}>
                  <span className="text-xs font-mono text-faint">Loading detections…</span>
                </div>
              )}
              {!loadingDet && detections && (
                <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead>
                      <tr style={{ position: "sticky", top: 0, background: "var(--surface-raised)", zIndex: 1 }}>
                        {["Time (UTC)","Species","Score","Latency"].map(h => (
                          <th key={h} style={{ textAlign: "left", padding: "6px 12px", fontFamily: "var(--font-mono)", fontSize: "0.65rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-faint)", borderBottom: "1px solid var(--border)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {detections.map((d, i) => {
                        const sc = parseFloat(d.score || 0);
                        const scoreColor = sc >= 0.65 ? "var(--accent-active)" : sc >= 0.3 ? "var(--accent-confidence)" : "var(--text-faint)";
                        return (
                          <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "5px 12px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-faint)" }}>{d.timestamp_utc?.substring(11,19)}</td>
                            <td style={{ padding: "5px 12px", fontFamily: "var(--font-display)", fontStyle: "italic", color: "var(--text-muted)" }}>{d.common_name}</td>
                            <td style={{ padding: "5px 12px", fontFamily: "var(--font-mono)", color: scoreColor, fontWeight: 600 }}>{sc.toFixed(3)}</td>
                            <td style={{ padding: "5px 12px", fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-faint)" }}>{d.latency_ms ? `${parseFloat(d.latency_ms).toFixed(0)}ms` : "—"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {detections.length === 0 && (
                    <p style={{ padding: "12px 16px", fontFamily: "var(--font-mono)", fontSize: "0.8rem", color: "var(--text-faint)" }}>No detection rows found for this event.</p>
                  )}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function EventsTable({ events = [], runId }) {
  if (!events.length) {
    return <div className="empty-state"><p>No events recorded</p></div>;
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>#</th>
            <th>Species</th>
            <th>Peak Score</th>
            <th>Start</th>
            <th>End</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => <EventRow key={e.event_id} e={e} runId={runId} />)}
        </tbody>
      </table>
    </div>
  );
}

function TabContent({ tab, data, loading, error, runId }) {
  if (loading) return (
    <div className="empty-state">
      <div className="dot dot-waiting" style={{ width: 12, height: 12 }} />
      <p className="font-mono text-sm text-muted">Loading…</p>
    </div>
  );
  if (error) return (
    <div className="empty-state">
      <span className="empty-icon">⚠️</span>
      <p className="text-alert text-sm">{error}</p>
    </div>
  );
  if (!data) return null;

  switch (tab) {
    case "species":    return <SpeciesFrequencyChart data={data} />;
    case "timeline":   return <DetectionTimeline data={data} />;
    case "confidence": return <ConfidenceHistogram data={data} />;
    case "top":        return <TopDetectionsChart data={data} />;
    case "profile":    return <ProfilingChart data={data} />;
    case "events":     return <EventsTable events={data} runId={runId} />;
    default:           return null;
  }
}

export default function RunDetail() {
  const { runId }      = useParams();
  const navigate       = useNavigate();
  const [tab, setTab]  = useState("species");
  const { data, loading, error } = useTabData(runId, tab);
  
  const [runs, setRuns] = useState([]);
  
  useEffect(() => {
    fetchRuns().then(setRuns).catch(() => {});
  }, []);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={`btn ${styles.back}`} onClick={() => navigate("/history")}>
          ← Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <h1 className={styles.title}>{formatRunId(runId)}</h1>
            <select 
              className="select" 
              value={runId}
              onChange={(e) => navigate(`/history/${e.target.value}`)}
            >
              {runs.map(r => (
                <option key={r} value={r}>{formatRunId(r)}</option>
              ))}
            </select>
          </div>
          <p className="text-xs font-mono text-faint mt-1">{runId}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
            id={`tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Chart area */}
      <div className={styles.chartArea}>
        <TabContent tab={tab} data={data} loading={loading} error={error} runId={runId} />
      </div>
    </div>
  );
}
