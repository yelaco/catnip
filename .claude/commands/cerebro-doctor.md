# Cerebro Doctor - Validate Workflow Health

Validate the Cerebro workflow configuration.

## Instructions for Cerebro

Run the checks below and report `PASS` or `FAIL` for each item. Do not modify files.

### 1. Command Namespace

```bash
find .claude/commands -maxdepth 1 -type f -name '*.md' -print | sort
```

Required:
- `.claude/commands/cerebro-doctor.md`
- `.claude/commands/cerebro-index.md`
- `.claude/commands/cerebro-plan.md`
- `.claude/commands/cerebro-setup.md`
- `.claude/commands/cerebro-start-work.md`
- `.claude/commands/cerebro-upgrade.md`
- `.claude/commands/to-me-my-x-men.md`

Forbidden:
- legacy built-in planning command file
- legacy built-in start-work command file

### 2. Stale Command References

Avoid embedding the legacy command literals in this file. Build them in shell:

```bash
legacy_plan="/""plan"
legacy_start="/""start-work"
legacy_plan_file=".claude/commands/""plan.md"
legacy_start_file=".claude/commands/""start-work.md"
rg -n "($legacy_plan)([[:space:]]|\\x60|$)|($legacy_start)([[:space:]]|\\x60|$)|$legacy_plan_file|$legacy_start_file" CLAUDE.md README.md .claude docs .cerebro
```

Expected: no matches, except archival docs only if intentionally retained and clearly marked historical.

### 3. Native Agent Frontmatter

```bash
python3 - <<'PY'
from pathlib import Path

required_agents = {
    "professor-x", "beast", "emma-frost", "cyclops", "wolverine",
    "forge", "nightcrawler", "sage", "storm",
}
valid_efforts = {"low", "medium", "high", "xhigh", "max"}
required_keys = {"name", "description", "model", "effort", "tools"}
failed = []
seen = set()

for path in sorted(Path(".claude/agents").glob("*.md")):
    text = path.read_text()
    if not text.startswith("---\n"):
        failed.append((str(path), "missing frontmatter"))
        continue
    end = text.find("\n---\n", 4)
    if end == -1:
        failed.append((str(path), "unterminated frontmatter"))
        continue
    frontmatter = {}
    for line in text[4:end].splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            frontmatter[key.strip()] = value.strip()
    missing = sorted(required_keys - set(frontmatter))
    if missing:
        failed.append((str(path), f"missing {missing}"))
        continue
    name = frontmatter["name"]
    seen.add(name)
    if name not in required_agents:
        failed.append((str(path), f"unexpected agent {name}"))
    if frontmatter["effort"] not in valid_efforts:
        failed.append((str(path), f"invalid effort {frontmatter['effort']}"))
    tools = {tool.strip() for tool in frontmatter["tools"].split(",")}
    if "Agent" in tools:
        failed.append((str(path), "Agent tool must not be allowed in subagents"))

missing_agents = sorted(required_agents - seen)
if missing_agents:
    failed.append((".claude/agents", f"missing agents {missing_agents}"))

if failed:
    for item in failed:
        print(item)
    raise SystemExit(1)
print("native agent frontmatter ok")
PY
```

### 4. Native Orchestration Compatibility

```bash
test ! -f .cerebro/agent-""models.json
catch_all="general-""purpose"
model_map="agent-""models"
reasoning_param="reasoning_""effort"
dm_key="default_""model"
de_key="default_""effort"
models_lookup="models""\\["
efforts_lookup="efforts""\\["
rg -n "$catch_all|$model_map|$reasoning_param|$dm_key|$de_key|$models_lookup|$efforts_lookup" CLAUDE.md README.md .claude docs .cerebro
```

Expected: first command passes; second command has no matches.

Confirm subagent files do not contain nested spawn instructions:

```bash
rg -n "Agent\\(" .claude/agents
```

Expected: no matches.

Confirm Cyclops no longer uses direct teammate handoff contracts from the pre-team workflow:

```bash
target_key="TARGET_""AGENT"
handoff_key="HAND""OFF"
call_wolverine="CALL_""WOLVERINE"
call_storm="CALL_""STORM"
call_forge="CALL_""FORGE"
rg -n "$target_key|$handoff_key|$call_wolverine|$call_storm|$call_forge" .claude/agents/cyclops.md .claude/commands
```

Expected: no matches.

Confirm every workflow command uses agent teams:

```bash
rg -n "Create an agent team|agent team lead|teammate|team mailbox|shared task list|Team Run Manifest" .claude/commands/cerebro-index.md .claude/commands/cerebro-plan.md .claude/commands/cerebro-start-work.md .claude/commands/to-me-my-x-men.md
```

Expected: each workflow command has team-mode instructions.

### 5. Plan Template

```bash
test -f .cerebro/templates/plan.md
rg -n "Risk Level|Approval Gates|Acceptance Criteria|Owner:|TDD:|Verify:|Rollback / Recovery" .cerebro/templates/plan.md
```

Expected: all required sections and task fields are present.

### 6. Skill Policy

```bash
test -f .cerebro/docs/skill-policy.md
rg -n "Skill Policy|Skills are optional" .cerebro/cerebro-identity.md .claude/agents/wolverine.md .claude/agents/storm.md .claude/agents/sage.md
```

Expected: core policy exists and key skill-using agents mention that skills are optional.

### 7. Project Context Template

```bash
test -f .cerebro/templates/project-context.md
rg -n "Stack|Entrypoints|Commands|Architecture|Conventions|Risky Areas|Agent Notes" .cerebro/templates/project-context.md
```

Expected: all project context sections are present.

### 8. Boulder Schema

```bash
python3 -m json.tool .cerebro/schemas/boulder.schema.json > /dev/null
```

Expected: valid JSON schema file exists.

If `.cerebro/boulder.json` exists, validate required top-level fields:

```bash
python3 - <<'PY'
import json
from pathlib import Path
state_path = Path(".cerebro/boulder.json")
schema_path = Path(".cerebro/schemas/boulder.schema.json")
if not schema_path.exists():
    print("missing schema")
    raise SystemExit(1)
if not state_path.exists():
    print("no active boulder state")
    raise SystemExit(0)
state = json.loads(state_path.read_text())
required = {
    "version", "active_plan", "plan_name", "status", "risk_level",
    "team_name", "started_at", "updated_at",
    "approval_gates", "verification_history", "decisions",
}
missing = sorted(required - set(state))
if missing:
    print({"missing": missing})
    raise SystemExit(1)
print("boulder state fields ok")
PY
```

### 9. Team Run Schema

```bash
test -d .cerebro/team-runs
test -f .cerebro/templates/team-run.json
test -f .cerebro/schemas/team-run.schema.json
python3 -m json.tool .cerebro/templates/team-run.json > /dev/null
python3 -m json.tool .cerebro/schemas/team-run.schema.json > /dev/null
rg -n "team-runs|team-run.schema.json|Team Run Manifest|TEAM_RUN_PATCH" .cerebro/cerebro-identity.md README.md .claude/commands .claude/agents/cyclops.md .cerebro/docs .cerebro/project-context.md
```

Expected: team run manifest template/schema are valid JSON and all team workflows mention the run manifest.

### 10. Hook Wiring

```bash
python3 -m json.tool .claude/settings.json > /dev/null
test -x .claude/hooks/check-pending-todos.sh
test -x .claude/hooks/check-task-result-envelope.sh
test -x .claude/hooks/log-team-event.sh
rg -n '"Stop"|"SubagentStop"|"TaskCreated"|"TaskCompleted"|"TeammateIdle"|check-pending-todos|check-task-result-envelope|log-team-event' .claude/settings.json
```

Expected: valid settings JSON, executable hooks, worker result enforcement, stop enforcement, and team lifecycle event logging wired.

### 11. Agent Team Configuration

```bash
python3 - <<'PY'
import json
from pathlib import Path
settings = json.loads(Path(".claude/settings.json").read_text())
env = settings.get("env", {})
if env.get("CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS") != "1":
    print("missing CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1")
    raise SystemExit(1)
print("agent teams enabled")
PY
rg -n "agent team|teammate|team mailbox|shared task list|NO NESTED TEAMS|CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS" .cerebro/cerebro-identity.md README.md .claude/commands .claude/agents/cyclops.md .cerebro/docs
```

Expected: experimental agent teams are enabled and team-mode guidance exists.

### 12. Stop Hook Behavior

```bash
bash .claude/hooks/check-pending-todos.sh
```

Expected: exit code `0` when no pending todos exist.

For block behavior, use a temporary backup and restore it:

```bash
tmp="$(mktemp)"
if [ -f .cerebro/.pending-todos ]; then cp .cerebro/.pending-todos "$tmp"; else : > "$tmp"; fi
printf "doctor temporary todo\n" > .cerebro/.pending-todos
bash .claude/hooks/check-pending-todos.sh
hook_status=$?
if [ -s "$tmp" ]; then cp "$tmp" .cerebro/.pending-todos; else rm -f .cerebro/.pending-todos; fi
rm -f "$tmp"
test "$hook_status" -eq 1
```

Expected: hook exits `1` while the temporary todo exists.

### 13. TASK_RESULT Hook Behavior

```bash
printf '{"hook_event_name":"SubagentStop","agent_type":"wolverine","last_assistant_message":"done"}' | bash .claude/hooks/check-task-result-envelope.sh | rg '"decision": "block"'
printf '{"hook_event_name":"SubagentStop","agent_type":"wolverine","last_assistant_message":"TASK_RESULT:\nSTATUS: PASS\nTESTS RUN:\n- None\nVERIFICATION:\n- None"}' | bash .claude/hooks/check-task-result-envelope.sh | test ! -s /dev/stdin
```

Expected: malformed result blocks; valid result allows stopping.

### 14. Upgrade Manifest and State

Check for the upgrade manifest. If absent, this is informational only — not a blocking failure. Existing projects that have not yet run `/cerebro-upgrade` will not have this file.

```bash
if [ ! -f .cerebro/upgrade-manifest.json ]; then
  echo "no manifest present (informational — run /cerebro-upgrade to initialize)"
else
  python3 -m json.tool .cerebro/upgrade-manifest.json > /dev/null && echo "upgrade-manifest.json valid"
fi
```

Check for the upgrade manifest schema:

```bash
test -f .cerebro/schemas/upgrade-manifest.schema.json && python3 -m json.tool .cerebro/schemas/upgrade-manifest.schema.json > /dev/null && echo "upgrade-manifest.schema.json valid"
```

Check for the upgrade state schema:

```bash
test -f .cerebro/schemas/upgrade-state.schema.json && python3 -m json.tool .cerebro/schemas/upgrade-state.schema.json > /dev/null && echo "upgrade-state.schema.json valid"
```

Validate manifest entry structure (if manifest is present):

```bash
python3 - <<'PY'
from pathlib import Path
import json
manifest_path = Path(".cerebro/upgrade-manifest.json")
if not manifest_path.exists():
    print("no manifest present (informational)")
    raise SystemExit(0)
manifest = json.loads(manifest_path.read_text())
valid_ownerships = {"template", "merge", "user"}
failed = []
entries = manifest.get("entries", [])
if not isinstance(entries, list) or len(entries) == 0:
    failed.append("entries must be a non-empty array")
for i, entry in enumerate(entries):
    if "path" not in entry:
        failed.append(f"entry {i}: missing 'path'")
    if "ownership" not in entry:
        failed.append(f"entry {i}: missing 'ownership'")
    elif entry["ownership"] not in valid_ownerships:
        failed.append(f"entry {i}: invalid ownership '{entry['ownership']}' (must be template, merge, or user)")
if failed:
    for f in failed:
        print(f)
    raise SystemExit(1)
print(f"manifest entries ok ({len(entries)} entries)")
PY
```

If `.cerebro/upgrade-state.json` exists, validate required fields:

```bash
python3 - <<'PY'
import json, re
from pathlib import Path
state_path = Path(".cerebro/upgrade-state.json")
if not state_path.exists():
    print("no upgrade-state.json present (informational — will be written after first /cerebro-upgrade)")
    raise SystemExit(0)
state = json.loads(state_path.read_text())
required = {"version", "applied_ref", "applied_sha", "applied_at", "hashes"}
missing = sorted(required - set(state))
if missing:
    print(f"upgrade-state.json missing fields: {missing}")
    raise SystemExit(1)
if state.get("version") != 1:
    print(f"unexpected version: {state.get('version')}")
    raise SystemExit(1)
sha = state.get("applied_sha", "")
if not re.match(r"^[0-9a-f]{40}$", sha):
    print(f"applied_sha is not a 40-char hex: {sha!r}")
    raise SystemExit(1)
if not isinstance(state.get("hashes"), dict):
    print("hashes must be an object")
    raise SystemExit(1)
print(f"upgrade-state.json valid (ref={state['applied_ref']}, sha={sha[:8]}...)")
PY
```

Expected: manifest and schemas parse as valid JSON, entries have required keys and valid ownership enum, and upgrade-state.json (if present) has all required fields. If upgrade-manifest.json is absent, section 14 exits zero with an informational message.
