/**
 * RunDetail.jsx — analytics view for a single historical run.
 *
 * Four tabs, each loading its data on demand:
 *  1. Species Frequency   → /api/runs/{id}/species-frequency
 *  2. Timeline            → /api/runs/{id}/timeline
 *  3. Confidence          → /api/runs/{id}/confidence
 *  4. System Profile      → /api/runs/{id}/profile
 *
 * Also shows the list of completed detection events.
 */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SpeciesFrequencyChart from "../components/charts/SpeciesFrequencyChart.jsx";
import DetectionTimeline from "../components/charts/DetectionTimeline.jsx";
import ConfidenceHistogram from "../components/charts/ConfidenceHistogram.jsx";
import ProfilingChart from "../components/charts/ProfilingChart.jsx";
import {
  fetchSpeciesFrequency, fetchTimeline,
  fetchConfidence, fetchProfile, fetchEvents,
} from "../api/client.js";
import styles from "./RunDetail.module.css";

const TABS = [
  { id: "species",    label: "Species Frequency" },
  { id: "timeline",  label: "Timeline" },
  { id: "confidence",label: "Confidence" },
  { id: "profile",   label: "System Profile" },
  { id: "events",    label: "Events" },
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
    };
    fetchers[tab]?.()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [runId, tab]);

  return { data, loading, error };
}

function EventsTable({ events = [] }) {
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
          {events.map((e) => (
            <tr key={e.event_id}>
              <td className="font-mono text-faint">{e.event_id}</td>
              <td className="font-display" style={{ fontStyle: "italic" }}>{e.peak_common_name}</td>
              <td className="font-mono" style={{
                color: e.peak_score >= 0.65 ? "var(--accent-active)" : "var(--accent-confidence)"
              }}>
                {parseFloat(e.peak_score).toFixed(3)}
              </td>
              <td className="font-mono text-xs text-muted">{e.start_utc?.substring(11, 19)}</td>
              <td className="font-mono text-xs text-muted">{e.end_utc?.substring(11, 19)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TabContent({ tab, data, loading, error }) {
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
    case "profile":    return <ProfilingChart data={data} />;
    case "events":     return <EventsTable events={data} />;
    default:           return null;
  }
}

export default function RunDetail() {
  const { runId }      = useParams();
  const navigate       = useNavigate();
  const [tab, setTab]  = useState("species");
  const { data, loading, error } = useTabData(runId, tab);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <button className={`btn ${styles.back}`} onClick={() => navigate("/history")}>
          ← Back
        </button>
        <div>
          <h1 className={styles.title}>{formatRunId(runId)}</h1>
          <p className="text-xs font-mono text-faint">{runId}</p>
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
        <TabContent tab={tab} data={data} loading={loading} error={error} />
      </div>
    </div>
  );
}
