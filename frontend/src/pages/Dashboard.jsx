/**
 * Dashboard.jsx — Live mode view.
 *
 * Layout:
 *   [PulseStrip — full width, top]
 *   [DetectionTicker (left rail, 280px) | SpeciesCard (right, flex)]
 *   [SystemHealth (footer)]
 *
 * WebSocket connects on mount with exponential-backoff auto-reconnect.
 * Keeps the last 100 inference rows; shows the most recent as the
 * "current" detection in the SpeciesCard.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import PulseStrip from "../components/PulseStrip.jsx";
import DetectionTicker from "../components/DetectionTicker.jsx";
import SpeciesCard from "../components/SpeciesCard.jsx";
import SystemHealth from "../components/SystemHealth.jsx";
import { createLiveSocket, fetchProfile } from "../api/client.js";
import styles from "./Dashboard.module.css";

const MAX_ROWS = 100;
const PROFILE_POLL_MS = 5000;

export default function Dashboard() {
  const [rows, setRows]               = useState([]);
  const [current, setCurrent]         = useState(null);
  const [runId, setRunId]             = useState(null);
  const [connStatus, setConnStatus]   = useState("waiting");
  const [pulseTrigger, setPulseTrigger] = useState(null);
  const [latestProfile, setLatestProfile] = useState(null);

  const runIdRef = useRef(null);
  const profileTimerRef = useRef(null);

  // Poll the latest profile row every PROFILE_POLL_MS
  const pollProfile = useCallback(async () => {
    if (!runIdRef.current) return;
    try {
      const data = await fetchProfile(runIdRef.current);
      if (data?.length) setLatestProfile(data[data.length - 1]);
    } catch { /* profile might not exist yet */ }
  }, []);

  useEffect(() => {
    profileTimerRef.current = setInterval(pollProfile, PROFILE_POLL_MS);
    return () => clearInterval(profileTimerRef.current);
  }, [pollProfile]);

  useEffect(() => {
    const cleanup = createLiveSocket({
      onConnect: () => setConnStatus("live"),
      onDisconnect: () => setConnStatus("waiting"),

      onRunStarted: (msg) => {
        setRunId(msg.run_id);
        runIdRef.current = msg.run_id;
        // Clear board for new run
        setRows([]);
        setCurrent(null);
        setLatestProfile(null);
      },

      onInference: (msg) => {
        setCurrent(msg);
        setPulseTrigger({ ...msg, _ts: Date.now() });
        setRows((prev) => [msg, ...prev].slice(0, MAX_ROWS));
      },

      onEventComplete: (_msg) => {
        // Future: could show a toast / notification for completed events
      },
    });

    return cleanup;
  }, []);

  return (
    <div className={styles.page}>
      <PulseStrip trigger={pulseTrigger} />

      <div className={styles.body}>
        {/* Left rail — running log */}
        <aside className={styles.rail} aria-label="Detection log">
          <div className={styles.railHeader}>
            <span className="text-xs font-mono text-faint">Detection Log</span>
            {rows.length > 0 && (
              <span className="text-xs font-mono text-faint">{rows.length} rows</span>
            )}
          </div>
          <DetectionTicker rows={rows} />
        </aside>

        {/* Right pane — species card */}
        <section className={styles.focus} aria-label="Current detection">
          <SpeciesCard
            detection={current}
            runId={runId}
            connectionStatus={connStatus}
          />
        </section>
      </div>

      {/* Footer — system health */}
      <SystemHealth profileRow={latestProfile} />
    </div>
  );
}
