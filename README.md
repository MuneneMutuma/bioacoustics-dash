# PiWild Detection Dashboard

Real-time bioacoustics detection dashboard for the Perch/Raspberry Pi field deployment.

```
pi/ (unchanged)                    dashboard/ (this subproject)
└── deployment/                    ├── backend/   ← FastAPI + WebSocket
    └── inference.py               │   └── app/
        writes CSV files           └── frontend/  ← React + Vite
               ↓ read                  served as static files
        dashboard reads them
        and streams to browser
```

---

## Quick start — development (any OS)

### 1. Backend

```bash
# Create a virtual environment (Linux/macOS)
cd dashboard/backend
python -m venv .venv
source .venv/bin/activate

# Windows (PowerShell)
cd dashboard\backend
python -m venv .venv
.venv\Scripts\Activate.ps1
```

```bash
pip install -r requirements.txt
```

```bash
# Point at the local runs/ directory (history only — no live stream unless inference.py is writing there)
uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

Verify: `http://localhost:8080/api/runs` should return a JSON list of run IDs.

### 2. Frontend (dev mode — Vite proxies /api and /ws to the backend)

```bash
# Linux/macOS
cd dashboard/frontend
npm install
npm run dev
```

```powershell
# Windows (PowerShell)
cd dashboard\frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

- **History tab**: works immediately from local `runs/` data.
- **Live tab**: shows "Waiting for detections…" until the backend detects a new or active run.

---

## Demo day — live detection mode

### Linux / macOS

```bash
# 1. Mount the Pi's runs/ directory via sshfs
mkdir -p ~/piwild-mount
sshfs perch@perch.local:/home/perch/deployment/runs ~/piwild-mount

# 2. Start the backend pointing at the mount
cd dashboard/backend
source .venv/bin/activate
export PERCH_RUNS_DIR=~/piwild-mount
export PIWILD_CONFIG=../../pi/deployment/config.yaml
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

### Windows (PowerShell)

Option A — WinFsp + SSHFS-Win (preferred, gives a drive letter):
```powershell
# Install: https://github.com/winfsp/sshfs-win
# Then mount:
net use Z: \\sshfs\perch@perch.local\home\perch\perch\deployment\runs

# Start the backend
cd dashboard\backend
.venv\Scripts\Activate.ps1
$env:PERCH_RUNS_DIR = "Z:\runs"
$env:PIWILD_CONFIG = "..\..\pi\deployment\config.yaml"
uvicorn app.main:app --host 0.0.0.0 --port 8080
```

Option B — Copy runs down (history only, no live stream):
```powershell
scp -r perch@perch.local:/home/perch/perch/deployment/runs .\pi\deployment\
# Then start backend without PERCH_RUNS_DIR override (uses local default)
```

### On the Raspberry Pi (unchanged)
```bash
ssh perch@perch.local
cd /home/perch/perch/deployment
source /home/perch/perch/venv/bin/activate
python inference.py
```

Play a bird call near the mic → species name, confidence bar, and pulse strip update within ~1 second.

---

## Production build (single process, no Node needed)

```bash
cd dashboard/frontend
npm run build
# Outputs to dashboard/backend/app/static/ automatically (vite.config.js)

cd ../backend
uvicorn app.main:app --host 0.0.0.0 --port 8080
# Open http://localhost:8080
```

---

## Docker / Podman deployment (Preferred)

The easiest and most reliable way to run the dashboard is using the included launcher scripts. They automatically handle mounting the Raspberry Pi via `sshfs` and spinning up the container using either Docker or Podman.

### Using the Launcher Scripts

1. Ensure you have `sshfs` and `podman-compose` (or `docker-compose`) installed on your host machine.
2. If your Raspberry Pi uses a different hostname or user, edit the top variables in `start.sh`.
3. Start the entire system:
   ```bash
   ./start.sh
   ```
   *This will mount the Pi to `~/piwild-mount`, build the container, and start the dashboard.*

4. Open `http://localhost:8080` in your browser.

5. When you're done, safely stop the containers and unmount the Pi:
   ```bash
   ./stop.sh
   ```

### Manual Container Deployment

If you prefer to run the commands manually without the launcher scripts:

```bash
# 1. Mount the Pi's runs directory via sshfs
mkdir -p ~/piwild-mount
sshfs perch@perch.local:/home/perch/deployment/runs ~/piwild-mount

# 2. Start using Compose (it defaults to the local git directory if PIWILD_MOUNT_DIR isn't set)
export PIWILD_MOUNT_DIR=~/piwild-mount
podman-compose up -d --build

# OR build and run via standard CLI:
podman build -t piwild-dashboard .
podman run -d -p 8080:8080 \
  -e PERCH_RUNS_DIR=/data/runs \
  -v ~/piwild-mount:/data/runs:ro \
  --name piwild-dashboard \
  piwild-dashboard
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PERCH_RUNS_DIR` | `pi/deployment/runs` (relative to repo root) | Path to the runs directory. Set to sshfs mount point for live demo. |
| `PIWILD_CONFIG` | `pi/deployment/config.yaml` | Path to config.yaml. Used to read thresholds etc. |
| `PIWILD_SOURCE` | `csv` | Detection source. `csv` = tail CSV files. Future: `lorawan`. |
| `PIWILD_POLL_SECONDS` | `0.5` | How often the watcher polls for new CSV rows. |

---

## Architecture overview

```
inference.py (Pi)
  └─ writes runs/<RUN_ID>/csv/inferences.csv  (flushed every row)
                              events.csv
                              profile.csv
        ↓ sshfs mount (demo) or file copy (history)
dashboard/backend/app/
  ├─ ingestion/csv_source.py   ← CsvTailer (offset-based, like tail -f)
  ├─ watcher.py                ← asyncio background task
  ├─ broadcaster.py            ← WebSocket fan-out
  ├─ routers/live.py           ← GET /api/status, WS /ws/live
  ├─ routers/history.py        ← GET /api/runs/...
  └─ analytics.py              ← pandas aggregations (on demand)
        ↓ served as static files (after npm run build)
dashboard/frontend/src/
  ├─ pages/Dashboard.jsx       ← Live mode (WebSocket)
  ├─ pages/History.jsx         ← Run selector
  └─ pages/RunDetail.jsx       ← Analytics charts (4 tabs)
```

### Adding a new chart

1. Write a pandas function in `backend/app/analytics.py`
2. Add one route in `backend/app/routers/history.py`
3. Add one React component in `frontend/src/components/charts/`
4. Add one tab entry in `RunDetail.jsx`

Nothing else changes.

### LoRaWAN migration path

When ready to replace CSV tailing with a live LoRaWAN feed:

1. Implement `LoRaWANSource` class in `backend/app/ingestion/lorawan_source.py`
   (subscribes to TTN MQTT, decodes the 6-byte payload that `lora_transmission.py` already sends)
2. Set `PIWILD_SOURCE=lorawan`
3. Everything downstream (broadcaster, analytics, frontend) is unchanged

---

## File structure

```
dashboard/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── models.py
│   │   ├── run_registry.py
│   │   ├── watcher.py
│   │   ├── broadcaster.py
│   │   ├── analytics.py
│   │   ├── ingestion/
│   │   │   ├── base.py          # DetectionSource protocol
│   │   │   └── csv_source.py    # CsvFileSource (today's impl)
│   │   └── routers/
│   │       ├── live.py
│   │       └── history.py
│   ├── requirements.txt
│   └── piwild-ui.service        # systemd unit (for permanent deployment)
└── frontend/
    ├── src/
    │   ├── api/client.js
    │   ├── components/
    │   │   ├── PulseStrip.jsx
    │   │   ├── SpeciesCard.jsx
    │   │   ├── DetectionTicker.jsx
    │   │   ├── SystemHealth.jsx
    │   │   └── charts/
    │   │       ├── SpeciesFrequencyChart.jsx
    │   │       ├── DetectionTimeline.jsx
    │   │       ├── ConfidenceHistogram.jsx
    │   │       └── ProfilingChart.jsx
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── History.jsx
    │   │   └── RunDetail.jsx
    │   ├── App.jsx
    │   ├── theme.css
    │   └── main.jsx
    ├── index.html
    ├── package.json
    └── vite.config.js
```
