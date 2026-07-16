/**
 * PulseStrip.jsx — the signature live element.
 *
 * A thin SVG strip across the top of the dashboard. Stays as a flat baseline
 * when idle, then fires a decaying spike animation each time a new detection
 * arrives above the print_threshold. The species name slides in beside the
 * spike like a field-guide caption.
 *
 * Props:
 *   trigger  — the latest DetectionEvent dict (or null). A new object reference
 *              triggers the animation even if the species is the same.
 */
import { useEffect, useRef, useState } from "react";
import styles from "./PulseStrip.module.css";

const WIDTH  = 800;
const HEIGHT = 56;
const MIDLINE = HEIGHT / 2;
const SPIKE_DECAY_MS = 2200;

function buildPath(amplitude) {
  // A simple smooth spike centred in the strip
  if (amplitude === 0) {
    return `M 0 ${MIDLINE} L ${WIDTH} ${MIDLINE}`;
  }
  const cx = WIDTH / 2;
  return [
    `M 0 ${MIDLINE}`,
    `L ${cx - 80} ${MIDLINE}`,
    `C ${cx - 40} ${MIDLINE}, ${cx - 20} ${MIDLINE - amplitude}, ${cx} ${MIDLINE - amplitude}`,
    `C ${cx + 20} ${MIDLINE - amplitude}, ${cx + 40} ${MIDLINE}, ${cx + 80} ${MIDLINE}`,
    `L ${WIDTH} ${MIDLINE}`,
  ].join(" ");
}

export default function PulseStrip({ trigger }) {
  const [amplitude, setAmplitude] = useState(0);
  const [label, setLabel]         = useState("");
  const animRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    if (!trigger) return;

    const peakAmp = Math.min(24, 8 + trigger.score * 20);
    setLabel(trigger.common_name || "");

    // Cancel any in-progress animation
    if (animRef.current) cancelAnimationFrame(animRef.current);

    startRef.current = performance.now();

    function step(now) {
      const elapsed = now - startRef.current;
      const t = Math.min(elapsed / SPIKE_DECAY_MS, 1);
      // Ease-out cubic decay
      const eased = 1 - Math.pow(t, 3);
      const amp = peakAmp * eased;
      setAmplitude(amp);
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setAmplitude(0);
        setLabel("");
      }
    }

    animRef.current = requestAnimationFrame(step);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [trigger]);

  const path = buildPath(amplitude);
  const isActive = amplitude > 0.5;

  return (
    <div className={styles.strip}>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
        className={styles.svg}
        aria-hidden="true"
      >
        {/* Glow layer */}
        {isActive && (
          <path d={path} className={styles.glow} />
        )}
        {/* Main line */}
        <path d={path} className={`${styles.line} ${isActive ? styles.lineActive : ""}`} />
      </svg>
      {label && (
        <span className={`${styles.caption} ${isActive ? styles.captionVisible : ""}`}>
          {label}
        </span>
      )}
    </div>
  );
}
