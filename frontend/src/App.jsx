import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import History from "./pages/History.jsx";
import RunDetail from "./pages/RunDetail.jsx";
import styles from "./App.module.css";

export default function App() {
  return (
    <BrowserRouter>
      <div className={styles.shell}>
        {/* Top navigation */}
        <nav className={styles.nav}>
          <div className={styles.navBrand}>
            <span className={styles.navIcon}>🐦</span>
            <span className={styles.navName}>PiWild</span>
            <span className={styles.navSub}>Detection Dashboard</span>
          </div>
          <div className={styles.navLinks}>
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
        </nav>

        {/* Page content */}
        <main className={styles.main}>
          <Routes>
            <Route path="/"              element={<Dashboard />} />
            <Route path="/history"       element={<History />} />
            <Route path="/history/:runId" element={<RunDetail />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
