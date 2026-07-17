/**
 * PulseStrip.jsx — Scrolling real-time waveform bar.
 *
 * Shows a scrolling EEG/oscilloscope-style bar that moves continuously,
 * spiking on each detection with amplitude proportional to confidence.
 * A "LIVE" indicator and last-detected species slide in on the right.
 */
import { useEffect, useRef, useState } from "react";
import styles from "./PulseStrip.module.css";

const CANVAS_H = 64;
const SCROLL_SPEED = 1.2;          // px per frame — the waveform scrolls left
const SPIKE_DECAY_MS = 1800;
const BASELINE_NOISE = 1.5;        // gentle idle wobble amplitude

export default function PulseStrip({ trigger }) {
  const canvasRef   = useRef(null);
  const spikeRef    = useRef({ amp: 0, startTime: 0, active: false });
  const historyRef  = useRef([]);   // amplitude history, pixel-wide columns
  const rafRef      = useRef(null);
  const [label, setLabel] = useState("");
  const [score, setScore] = useState(null);
  const [active, setActive] = useState(false);

  // Fire spike on new detection
  useEffect(() => {
    if (!trigger) return;
    const peakAmp = 8 + Math.min(trigger.score, 1) * 22;
    spikeRef.current = { amp: peakAmp, startTime: performance.now(), active: true };
    setLabel(trigger.common_name || "");
    setScore(trigger.score ?? null);
    setActive(true);
    const id = setTimeout(() => setActive(false), SPIKE_DECAY_MS + 400);
    return () => clearTimeout(id);
  }, [trigger]);

  // Canvas draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    // Ensure history buffer is pre-filled
    if (historyRef.current.length === 0) {
      historyRef.current = new Array(canvas.width).fill(0);
    }

    function getColor(amp, alpha = 1) {
      if (amp > 14) return `rgba(212,162,78,${alpha})`;   // amber — high
      if (amp > 6)  return `rgba(107,143,113,${alpha})`;  // green — mid
      return `rgba(90,100,95,${alpha})`;                  // muted — idle
    }

    function draw(now) {
      const W = canvas.width;
      const H = canvas.height;
      const mid = H / 2;

      // Compute current spike amplitude
      const spike = spikeRef.current;
      let spikeAmp = 0;
      if (spike.active) {
        const elapsed = now - spike.startTime;
        const t = Math.min(elapsed / SPIKE_DECAY_MS, 1);
        spikeAmp = spike.amp * (1 - Math.pow(t, 2.5));
        if (t >= 1) spike.active = false;
      }

      // Idle noise wobble
      const noise = Math.sin(now / 280) * BASELINE_NOISE + Math.sin(now / 110) * 0.6;
      const currentAmp = spikeAmp + Math.abs(noise);

      // Scroll history left by SCROLL_SPEED
      const scrollBy = Math.ceil(SCROLL_SPEED);
      for (let i = 0; i < scrollBy; i++) {
        historyRef.current.shift();
        historyRef.current.push(currentAmp);
      }

      // ─── Draw ───
      ctx.clearRect(0, 0, W, H);

      // Subtle grid lines
      ctx.strokeStyle = "rgba(255,255,255,0.04)";
      ctx.lineWidth = 1;
      for (let y = mid - 20; y <= mid + 20; y += 10) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // Waveform path
      ctx.beginPath();
      const hist = historyRef.current;
      ctx.moveTo(0, mid - hist[0]);
      for (let x = 1; x < W; x++) {
        ctx.lineTo(x, mid - hist[x]);
      }
      // Mirror bottom half
      for (let x = W - 1; x >= 0; x--) {
        ctx.lineTo(x, mid + hist[x]);
      }
      ctx.closePath();

      // Gradient fill
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      const peakInView = Math.max(...hist);
      const col = getColor(peakInView);
      grad.addColorStop(0, col.replace(/[\d.]+\)$/, "0)"));
      grad.addColorStop(0.5, col.replace(/[\d.]+\)$/, "0.25)"));
      grad.addColorStop(1, col.replace(/[\d.]+\)$/, "0.1)"));
      ctx.fillStyle = grad;
      ctx.fill();

      // Waveform stroke
      ctx.beginPath();
      ctx.moveTo(0, mid - hist[0]);
      for (let x = 1; x < W; x++) ctx.lineTo(x, mid - hist[x]);
      ctx.strokeStyle = getColor(peakInView, 0.7);
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, mid + hist[0]);
      for (let x = 1; x < W; x++) ctx.lineTo(x, mid + hist[x]);
      ctx.strokeStyle = getColor(peakInView, 0.3);
      ctx.lineWidth = 1;
      ctx.stroke();

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Resize canvas to match display width
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.floor(e.contentRect.width);
      canvas.width  = w;
      canvas.height = CANVAS_H;
      historyRef.current = new Array(w).fill(0);
    });
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, []);

  const scoreColor = score == null ? "var(--text-muted)"
    : score >= 0.65 ? "var(--accent-active)"
    : score >= 0.3  ? "var(--accent-confidence)"
    :                 "var(--accent-alert)";

  return (
    <div className={styles.strip}>
      {/* Left: live status chip */}
      <div className={styles.statusChip}>
        <span className={`dot dot-live`} style={{ width: 8, height: 8 }} />
        <span className={styles.statusLabel}>RECORDING</span>
      </div>

      {/* Canvas waveform */}
      <canvas ref={canvasRef} className={styles.canvas} height={CANVAS_H} />

      {/* Right: last detection label */}
      <div className={`${styles.detectionTag} ${active ? styles.detectionTagVisible : ""}`}>
        {score != null && (
          <span className={styles.scoreChip} style={{ color: scoreColor, borderColor: scoreColor }}>
            {Math.round(score * 100)}%
          </span>
        )}
        <span className={styles.labelText}>{label}</span>
      </div>
    </div>
  );
}
