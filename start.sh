#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# ==============================================================================
# PiWild Dashboard Super Launcher
# Automatically handles SSHFS mounting and container orchestration
# ==============================================================================

# --- Configuration (edit these if your Pi has a different address/path) ---
PI_USER="perch"
PI_HOST="perch.local"
REMOTE_RUNS_DIR="/home/perch/deployment/runs"
LOCAL_MOUNT_DIR="$HOME/piwild-mount"
# --------------------------------------------------------------------------

echo "========================================"
echo "🐦 PiWild Dashboard Launcher"
echo "========================================"

# 1. Ensure the local mount directory exists
mkdir -p "$LOCAL_MOUNT_DIR"

# 2. Check if it's already mounted; if not, mount it via SSHFS
if mountpoint -q "$LOCAL_MOUNT_DIR"; then
    echo "✅ SSHFS is already mounted at $LOCAL_MOUNT_DIR."
else
    echo "🔄 Mounting $PI_USER@$PI_HOST:$REMOTE_RUNS_DIR to $LOCAL_MOUNT_DIR..."
    
    # Check if sshfs is installed
    if ! command -v sshfs >/dev/null 2>&1; then
        echo "❌ Error: sshfs is not installed! Please install it (e.g. sudo apt install sshfs)."
        exit 1
    fi
    
    sshfs "$PI_USER@$PI_HOST:$REMOTE_RUNS_DIR" "$LOCAL_MOUNT_DIR"
    echo "✅ Mount successful."
fi

# 3. Determine whether to use podman-compose or docker-compose
if command -v podman-compose >/dev/null 2>&1; then
    COMPOSE_CMD="podman-compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Error: Neither podman-compose nor docker-compose found!"
    echo "   Please install one of them to run the container."
    exit 1
fi

echo "🚀 Starting dashboard using $COMPOSE_CMD..."

# Export the mount directory so docker-compose.yml uses it for the volume mapping
export PIWILD_MOUNT_DIR="$LOCAL_MOUNT_DIR"

# 4. Start the container in detached mode
$COMPOSE_CMD up -d --build

echo "========================================"
echo "🎉 Dashboard is running!"
echo "👉 Open your browser to: http://localhost:8080"
echo ""
echo "To view logs:  $COMPOSE_CMD logs -f"
echo "To stop:       ./stop.sh (or $COMPOSE_CMD down)"
echo "========================================"
