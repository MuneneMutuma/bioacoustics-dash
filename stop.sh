#!/bin/bash

LOCAL_MOUNT_DIR="$HOME/piwild-mount"

echo "========================================"
echo "🛑 Stopping PiWild Dashboard"
echo "========================================"

if command -v podman-compose >/dev/null 2>&1; then
    COMPOSE_CMD="podman-compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    echo "❌ Error: Neither podman-compose nor docker-compose found!"
    exit 1
fi

echo "🔻 Shutting down containers..."
export PIWILD_MOUNT_DIR="$LOCAL_MOUNT_DIR"
$COMPOSE_CMD down

echo "🔻 Unmounting SSHFS (if mounted)..."
if mountpoint -q "$LOCAL_MOUNT_DIR"; then
    # Use fusermount -u on Linux, umount on macOS
    if command -v fusermount >/dev/null 2>&1; then
        fusermount -u "$LOCAL_MOUNT_DIR"
    else
        umount "$LOCAL_MOUNT_DIR"
    fi
    echo "✅ SSHFS unmounted."
else
    echo "✅ Nothing to unmount."
fi

echo "========================================"
echo "👋 Done!"
echo "========================================"
