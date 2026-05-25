#!/bin/sh
set -e

# Ensure log directory exists and has correct permissions
LOG_DIR="/app/ai-server/logs"
mkdir -p "$LOG_DIR"

# Set group write permissions on log directory and files
# This allows both whif user and ubuntu user (in whif group) to access logs
chmod 775 "$LOG_DIR"
if [ -n "$(ls -A "$LOG_DIR" 2>/dev/null)" ]; then
    chmod 664 "$LOG_DIR"/*.log 2>/dev/null || true
fi

# Set umask for group write permissions on new files
umask 002

# Execute the main command
exec "$@"
