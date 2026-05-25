#!/bin/bash
set -euo pipefail

hook=".claude/hooks/check-task-result-envelope.sh"

bad_output="$(
  printf '%s' '{"hook_event_name":"SubagentStop","agent_type":"wolverine","last_assistant_message":"done"}' \
    | bash "$hook"
)"

case "$bad_output" in
  *'"decision": "block"'*) ;;
  *)
    echo "expected malformed Wolverine output to block" >&2
    exit 1
    ;;
esac

good_output="$(
  printf '%s' '{"hook_event_name":"SubagentStop","agent_type":"storm","last_assistant_message":"TASK_RESULT:\nSTATUS: PASS\nTESTS RUN:\n- None\nVERIFICATION:\n- None"}' \
    | bash "$hook"
)"

if [ -n "$good_output" ]; then
  echo "expected valid Storm output to pass without hook output" >&2
  exit 1
fi

other_output="$(
  printf '%s' '{"hook_event_name":"SubagentStop","agent_type":"sage","last_assistant_message":"done"}' \
    | bash "$hook"
)"

if [ -n "$other_output" ]; then
  echo "expected non-worker output to pass without hook output" >&2
  exit 1
fi

echo "task result envelope hook ok"
