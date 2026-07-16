/**
 * SystemHealth.jsx — compact resource monitor strip.
 *
 * Displays the latest profile.csv row values: CPU%, RAM%, latency.
 * Receives `profileRow` prop (object from /api/runs/{id}/profile, last row).
 * Used as an optional overlay in the live dashboard footer.
 */
import styles from "./SystemHealth.module.css";

function Gauge({ label, value, unit = "%", warn = 70, crit = 90 }) {
  const n = parseFloat(value);
  const cls = n >= crit ? "alert" : n >= warn ? "warn" : "ok";
  return (
    <div className={styles.gauge}>
      <span className={`${styles.gaugeVal} ${styles[cls]}`}>
        {isNaN(n) ? "—" : n.toFixed(1)}{unit}
      </span>
      <span className={styles.gaugeLabel}>{label}</span>
    </div>
  );
}

export default function SystemHealth({ profileRow }) {
  if (!profileRow) return null;

  return (
    <div className={styles.bar}>
      <Gauge label="Proc CPU" value={profileRow.proc_cpu_percent} warn={60} crit={85} />
      <Gauge label="Sys CPU"  value={profileRow.system_cpu_percent} warn={70} crit={90} />
      <Gauge label="RAM"      value={profileRow.system_ram_percent} warn={75} crit={90} />
      <Gauge label="Proc RAM" value={profileRow.proc_mem_mb} unit=" MB" warn={1500} crit={3000} />
      <Gauge label="Load 1m"  value={profileRow.load1} unit="" warn={3} crit={6} />
    </div>
  );
}
