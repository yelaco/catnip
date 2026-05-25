#!/bin/bash

python3 -c '
import datetime
import json
import sys
from pathlib import Path

try:
    data = json.load(sys.stdin)
except Exception:
    raise SystemExit(0)

event = data.get("hook_event_name") or "Unknown"
if event not in {"TaskCreated", "TaskCompleted", "TeammateIdle"}:
    raise SystemExit(0)

root = Path(".cerebro/team-runs")
root.mkdir(parents=True, exist_ok=True)

record = {
    "logged_at": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
    "event": event,
    "session_id": data.get("session_id"),
    "team_id": data.get("team_id"),
    "team_name": data.get("team_name"),
    "teammate": data.get("teammate") or data.get("teammate_name") or data.get("agent_name"),
    "task_id": data.get("task_id"),
    "task_title": data.get("task_title") or data.get("title"),
    "status": data.get("status"),
}

with (root / "events.jsonl").open("a", encoding="utf-8") as handle:
    handle.write(json.dumps(record, sort_keys=True) + "\n")
'
