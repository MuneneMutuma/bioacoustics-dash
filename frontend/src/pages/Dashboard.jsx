/**
 * Dashboard.jsx — Live mode view.
 *
 * Layout:
 *   [PulseStrip — full width, top]
 *   [DetectionTicker (left rail, 280px) | SpeciesCard (right, flex)]
 *   [SystemHealth (footer)]
 *
 * State is now managed by LiveContext so navigating away and back
 * retains the WebSocket connection and all detection rows.
 */
import PulseStrip from "../components/PulseStrip.jsx";
import DetectionTicker from "../components/DetectionTicker.jsx";
import SpeciesCard from "../components/SpeciesCard.jsx";
import SystemHealth from "../components/SystemHealth.jsx";
import { useLive } from "../context/LiveContext.jsx";
import styles from "./Dashboard.module.css";

export default function Dashboard() {
  const { rows, current, runId, connStatus, pulseTrigger, latestProfile } = useLive();

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
            rows={rows}
          />
        </section>
      </div>

      {/* Footer — system health */}
      <SystemHealth profileRow={latestProfile} />
    </div>
  );
}
