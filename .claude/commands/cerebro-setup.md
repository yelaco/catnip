# Cerebro Setup — Initialize and Verify Installation

Run after cloning the template or any time the installation feels misconfigured. Wires `CLAUDE.md` correctly and checks whether the upstream template has a newer release.

## Instructions for Cerebro

This is a **Cerebro-led single-flow operation**. Do NOT create an agent team. Do NOT touch `.cerebro/.pending-todos`. Do NOT spawn Wolverine or Storm. Handle everything directly, like `/cerebro-doctor`.

Upstream remote: `https://github.com/yelaco/claude-xmen.git`

---

### 1. Wire CLAUDE.md

Check whether `CLAUDE.md` already imports the Cerebro identity:

```bash
grep -q '@.cerebro/cerebro-identity.md' CLAUDE.md && echo "import present" || echo "import missing"
```

**If missing:** prepend `@.cerebro/cerebro-identity.md` as the very first line of `CLAUDE.md`, preserving all existing content below it. Report what was changed.

**If present:** confirm and move on — do not touch the file.

---

### 2. Verify cerebro-identity.md Exists

```bash
test -f .cerebro/cerebro-identity.md && echo "identity file present" || echo "identity file MISSING"
```

If missing, warn the user:

> `.cerebro/cerebro-identity.md` not found. Run `/cerebro-upgrade <latest-tag>` to restore it — without this file the Cerebro runtime will not load.

---

### 3. Determine Installed Version

Check for a recorded upgrade state:

```bash
python3 - <<'PY'
import json
from pathlib import Path

state_path = Path(".cerebro/upgrade-state.json")
if state_path.exists():
    state = json.loads(state_path.read_text())
    print(state.get("applied_ref", "unknown"))
else:
    print("none")
PY
```

If the result is `none`, the installed version is **unknown** (either a fresh clone or a pre-upgrade install).

---

### 4. Fetch Latest Upstream Tag

```bash
git ls-remote --tags --sort='-v:refname' https://github.com/yelaco/claude-xmen.git 'refs/tags/v*' \
  | head -1 \
  | sed 's|.*refs/tags/||'
```

If the command fails (no network, repo unreachable), skip version comparison and report:

> Could not reach upstream — skipping version check. Check your connection and try again.

---

### 5. Compare and Report

With both versions in hand, report clearly:

**Up to date:**
> Cerebro installation is current at `<version>`. No upgrade needed.

**Behind:**
> Upstream has `<latest>` — you are on `<installed>`. Run `/cerebro-upgrade <latest>` to sync.

**Unknown installed version:**
> Installed version is unknown (no upgrade-state.json). Latest upstream is `<latest>`. Run `/cerebro-upgrade <latest>` to initialize upgrade tracking.

---

### 6. Summary

Print a brief setup report:

```
CLAUDE.md import     — PRESENT | FIXED
cerebro-identity.md  — PRESENT | MISSING
installed version    — <ref> | unknown
latest upstream      — <ref> | unreachable
upgrade needed       — YES | NO | UNKNOWN
```
