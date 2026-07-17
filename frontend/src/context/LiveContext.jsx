/**
 * LiveContext.jsx — App-level live detection state.
 *
 * Holds the WebSocket connection, detection rows, run ID, and profile data
 * at the top level so navigating away from the Live page (to History etc.)
 * does NOT disconnect or lose state. Navigating back resumes instantly.
 */
import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { createLiveSocket, fetchProfile } from "../api/client.js";

const MAX_ROWS       = 100;
const PROFILE_POLL_MS = 5000;

const LiveContext = createContext(null);

export function LiveProvider({ children }) {
  const [rows, setRows]             = useState([]);
  const [current, setCurrent]       = useState(null);
  const [runId, setRunId]           = useState(null);
  const [connStatus, setConnStatus] = useState("waiting");
  const [pulseTrigger, setPulseTrigger] = useState(null);
  const [latestProfile, setLatestProfile] = useState(null);

  const runIdRef       = useRef(null);
  const profileTimerRef = useRef(null);

  const pollProfile = useCallback(async () => {
    if (!runIdRef.current) return;
    try {
      const data = await fetchProfile(runIdRef.current);
      if (data?.length) setLatestProfile(data[data.length - 1]);
    } catch { /* profile might not exist yet */ }
  }, []);

  // Profile polling — runs for the app lifetime
  useEffect(() => {
    profileTimerRef.current = setInterval(pollProfile, PROFILE_POLL_MS);
    return () => clearInterval(profileTimerRef.current);
  }, [pollProfile]);

  // WebSocket — runs for the app lifetime
  useEffect(() => {
    const cleanup = createLiveSocket({
      onConnect:    () => setConnStatus("live"),
      onDisconnect: () => setConnStatus("waiting"),

      onRunStarted: (msg) => {
        setRunId(msg.run_id);
        runIdRef.current = msg.run_id;
        setRows([]);
        setCurrent(null);
        setLatestProfile(null);
      },

      onInference: (msg) => {
        setCurrent(msg);
        setPulseTrigger({ ...msg, _ts: Date.now() });
        setRows(prev => [msg, ...prev].slice(0, MAX_ROWS));
      },

      onEventComplete: () => {},
    });

    return cleanup;
  }, []);

  return (
    <LiveContext.Provider value={{
      rows, current, runId, connStatus, pulseTrigger, latestProfile,
    }}>
      {children}
    </LiveContext.Provider>
  );
}

export function useLive() {
  return useContext(LiveContext);
}
