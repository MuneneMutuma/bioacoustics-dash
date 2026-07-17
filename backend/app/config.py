"""
config.py — reads the same config.yaml that inference.py uses.

PERCH_RUNS_DIR env var overrides the runs_dir from config — set this to
your sshfs mount point when running the live demo. For local dev, it
defaults to the local pi/deployment/runs directory in this repo.

PIWILD_CONFIG env var overrides the config.yaml path entirely.
"""
import os
from pathlib import Path
import yaml

# ---------------------------------------------------------------------------
# Locate config.yaml
# ---------------------------------------------------------------------------
# Default: walk up from this file to bioacoustics/pi/deployment/config.yaml
_HERE = Path(__file__).resolve()

# Safely handle the case where we are in Docker (/app/app/config.py)
if len(_HERE.parents) >= 4:
    _REPO_ROOT = _HERE.parents[3]  # dashboard/backend/app/config.py -> bioacoustics/
    _DEFAULT_CONFIG = _REPO_ROOT / "pi" / "deployment" / "config.yaml"
    _LOCAL_RUNS_DEFAULT = _REPO_ROOT / "pi" / "deployment" / "runs"
else:
    _REPO_ROOT = Path("/")
    _DEFAULT_CONFIG = Path("/data/config.yaml")
    _LOCAL_RUNS_DEFAULT = Path("/data/runs")

CONFIG_PATH = Path(os.getenv("PIWILD_CONFIG", str(_DEFAULT_CONFIG)))

CFG: dict = {}
if CONFIG_PATH.exists():
    with open(CONFIG_PATH, "r", encoding="utf-8") as _f:
        CFG = yaml.safe_load(_f) or {}
else:
    # Print a warning but don't crash
    print(f"Warning: config file {CONFIG_PATH} not found. Using defaults.")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
# PERCH_RUNS_DIR env var → sshfs mount or explicit override
# Falls back to: (1) config.yaml paths.runs_dir if that path exists locally,
#                (2) the local pi/deployment/runs inside this repo
_cfg_runs = CFG.get("paths", {}).get("runs_dir", "")

if "PERCH_RUNS_DIR" in os.environ:
    RUNS_DIR = Path(os.environ["PERCH_RUNS_DIR"])
elif _cfg_runs and Path(_cfg_runs).exists():
    RUNS_DIR = Path(_cfg_runs)
else:
    # The Pi's absolute path doesn't exist here → use the local repo copy
    RUNS_DIR = _LOCAL_RUNS_DEFAULT

LOGS_DIR = RUNS_DIR.parent / "logs"

_cfg_labels = CFG.get("paths", {}).get("labels_csv", "")
LABEL_PATH = Path(os.getenv("PERCH_LABEL_PATH", _cfg_labels))

# ---------------------------------------------------------------------------
# Watcher settings
# ---------------------------------------------------------------------------
POLL_SECONDS: float = float(os.getenv("PIWILD_POLL_SECONDS", "0.5"))
PRINT_THRESHOLD: float = float(CFG.get("inference", {}).get("print_threshold", 0.3))
