#!/bin/bash

python3 -c '
import json
import sys

try:
    data = json.load(sys.stdin)
except Exception:
    # If Claude Code does not provide JSON for this runtime, do not block.
    raise SystemExit(0)

agent = data.get("agent_type") or data.get("subagent_type") or ""
if agent not in {"wolverine", "storm"}:
    raise SystemExit(0)

message = data.get("last_assistant_message") or data.get("last_message") or ""
required = ["TASK_RESULT:", "STATUS:", "TESTS RUN:", "VERIFICATION:"]
missing = [item for item in required if item not in message]

valid_status = any(
    status in message
    for status in ("STATUS: PASS", "STATUS: FAIL", "STATUS: BLOCKED")
)
if not valid_status:
    missing.append("STATUS: PASS | FAIL | BLOCKED")

if missing:
    print(json.dumps({
        "decision": "block",
        "reason": (
            "Return exactly one TASK_RESULT block before stopping. "
            "Missing or invalid fields: " + ", ".join(missing)
        ),
    }))

raise SystemExit(0)
'
