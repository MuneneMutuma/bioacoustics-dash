const BASE = "";

export async function fetchStatus() {
  const res = await fetch(`${BASE}/api/status`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function fetchRuns() {
  const res = await fetch(`${BASE}/api/runs`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function fetchRunDetail(runId) {
  const res = await fetch(`${BASE}/api/runs/${runId}`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function fetchSpeciesFrequency(runId, threshold = 0.5) {
  const res = await fetch(`${BASE}/api/runs/${runId}/species-frequency?threshold=${threshold}`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function fetchTimeline(runId) {
  const res = await fetch(`${BASE}/api/runs/${runId}/timeline`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function fetchConfidence(runId, bins = 20) {
  const res = await fetch(`${BASE}/api/runs/${runId}/confidence?bins=${bins}`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function fetchProfile(runId) {
  const res = await fetch(`${BASE}/api/runs/${runId}/profile`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export async function fetchEvents(runId) {
  const res = await fetch(`${BASE}/api/runs/${runId}/events`);
  if (!res.ok) throw new Error(`status ${res.status}`);
  return res.json();
}

export function createLiveSocket(handlers) {
  let ws = null;
  let reconnectTimer = null;
  let stopped = false;
  let delay = 1000;

  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const url = `${protocol}://${window.location.host}/ws/live`;

  function connect() {
    ws = new WebSocket(url);

    ws.onopen = () => {
      delay = 1000;
      handlers.onConnect?.();
      ws._pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("ping");
      }, 20_000);
    };

    ws.onmessage = (evt) => {
      let msg;
      try { msg = JSON.parse(evt.data); } catch { return; }
      switch (msg.type) {
        case "inference":      handlers.onInference?.(msg);      break;
        case "event_complete": handlers.onEventComplete?.(msg);  break;
        case "run_started":    handlers.onRunStarted?.(msg);     break;
      }
    };

    ws.onclose = () => {
      clearInterval(ws._pingInterval);
      handlers.onDisconnect?.();
      if (!stopped) {
        reconnectTimer = setTimeout(() => {
          delay = Math.min(delay * 1.5, 15_000);
          connect();
        }, delay);
      }
    };

    ws.onerror = () => ws.close();
  }

  connect();

  return () => {
    stopped = true;
    clearTimeout(reconnectTimer);
    clearInterval(ws?._pingInterval);
    ws?.close();
  };
}
