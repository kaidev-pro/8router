#!/bin/bash
# 8Router RC Observation Monitor
# Run periodically during soak period

LOG="/root/8router/docs/evidence/phase5f/rc-observation.log"
mkdir -p "$(dirname "$LOG")"

ts() { date -u "+%Y-%m-%d %H:%M:%S UTC"; }

echo "---" >> "$LOG"
echo "timestamp: $(ts)" >> "$LOG"

# Service status
STATUS=$(systemctl is-active 8router.service 2>/dev/null)
echo "service: $STATUS" >> "$LOG"

# PID + memory
PID=$(systemctl show 8router.service -p MainPID --value)
RSS=$(ps -p $PID -o rss= 2>/dev/null | tr -d " ")
echo "pid: $PID" >> "$LOG"
echo "memory_rss_kb: ${RSS:-N/A}" >> "$LOG"

# Uptime
UPTIME=$(ps -p $PID -o etime= 2>/dev/null | tr -d " ")
echo "process_uptime: ${UPTIME:-N/A}" >> "$LOG"

# Health endpoint
HEALTH=$(curl -s -o /dev/null -w "%{http_code} %{time_total}" http://localhost:8080/health 2>/dev/null)
echo "health: $HEALTH" >> "$LOG"

# Restart count
RESTARTS=$(systemctl show 8router.service -p NRestarts --value)
echo "restarts: $RESTARTS" >> "$LOG"

# Error count in last 5 min
ERRORS=$(journalctl -u 8router.service --since "5 min ago" --no-pager 2>/dev/null | grep -ci "error\|crash\|fatal\|uncaught")
echo "errors_5min: $ERRORS" >> "$LOG"

# Secret leak check
LEAKS=$(journalctl -u 8router.service --since "5 min ago" --no-pager 2>/dev/null | grep -ciE "sk-[a-zA-Z0-9]{20,}|Bearer sk-")
echo "secret_leaks: $LEAKS" >> "$LOG"

echo "observation: ok" >> "$LOG"
