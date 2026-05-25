#!/bin/bash

TODOS_FILE=".cerebro/.pending-todos"

if [ -f "$TODOS_FILE" ] && [ -s "$TODOS_FILE" ]; then
    python3 - "$TODOS_FILE" <<'PYEOF'
import json
import sys

todos_file = sys.argv[1]
with open(todos_file) as f:
    lines = [l.rstrip() for l in f if l.strip()]

if lines:
    todo_list = "\n".join(f"  - [ ] {l}" for l in lines)
    reason = (
        "\n[SYSTEM REMINDER - TODO CONTINUATION]\n\n"
        "You have incomplete todos! Complete ALL before responding:\n\n"
        f"{todo_list}\n\n"
        "DO NOT respond until all todos are marked completed and removed from .cerebro/.pending-todos"
    )
    print(json.dumps({"decision": "block", "reason": reason}))
PYEOF
fi

exit 0
