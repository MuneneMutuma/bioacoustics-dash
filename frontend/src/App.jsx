import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import Dashboard from "./pages/Dashboard.jsx";
import History from "./pages/History.jsx";
import RunDetail from "./pages/RunDetail.jsx";
import { LiveProvider } from "./context/LiveContext.jsx";
import styles from "./App.module.css";

const THEMES = [
  { id: "forest-dark", label: "🌲 Forest Dark" },
  { id: "slate",       label: "🌙 Slate Night" },
  { id: "ivory",       label: "📄 Ivory Light" },
  { id: "arctic",      label: "❄️  Arctic" },
  { id: "sand",        label: "🏜️  Warm Sand" },
];

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem("piwild-theme") || "forest-dark");
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("piwild-theme", theme);
  }, [theme]);
  return [theme, setTheme];
}

export default function App() {
  const [theme, setTheme] = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);

  return (
    <BrowserRouter>
      {/* LiveProvider wraps everything so the WebSocket persists across page navigation */}
      <LiveProvider>
        <div className={styles.shell}>
          {/* Top navigation */}
          <nav className={styles.nav}>
            <div className={styles.navBrand}>
              <span className={styles.navIcon}>🐦</span>
              <span className={styles.navName}>PiWild</span>
              <span className={styles.navSub}>Detection Dashboard</span>
            </div>

            <div className={styles.navCenter}>
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
                }
              >
                Live
              </NavLink>
              <NavLink
                to="/history"
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`
                }
              >
                History
              </NavLink>
            </div>

            {/* Theme picker */}
            <div className={styles.navRight}>
              <div className={styles.themePicker}>
                <button
                  className={styles.themeBtn}
                  onClick={() => setThemeOpen((o) => !o)}
                  aria-label="Switch theme"
                  title="Switch theme"
                >
                  🎨
                  <span className={styles.themeBtnLabel}>
                    {THEMES.find((t) => t.id === theme)?.label.split(" ").slice(1).join(" ")}
                  </span>
                  <span className={styles.chevron}>{themeOpen ? "▲" : "▼"}</span>
                </button>

                {themeOpen && (
                  <div className={styles.themeDropdown}>
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        className={`${styles.themeOption} ${t.id === theme ? styles.themeOptionActive : ""}`}
                        onClick={() => { setTheme(t.id); setThemeOpen(false); }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </nav>

          {/* Page content */}
          <main className={styles.main}>
            <Routes>
              <Route path="/"               element={<Dashboard />} />
              <Route path="/history"        element={<History />} />
              <Route path="/history/:runId" element={<RunDetail />} />
            </Routes>
          </main>
        </div>

        {/* Click-away to close theme picker */}
        {themeOpen && (
          <div className={styles.backdrop} onClick={() => setThemeOpen(false)} />
        )}
      </LiveProvider>
    </BrowserRouter>
  );
}
