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

### 6. Semble Integration (Optional)

Ask the user whether they want to enable semble for semantic code search:

> **Semble** is an optional MCP integration that gives Nightcrawler natural-language code search — ~98% fewer tokens than grep+read, fully on CPU, no API key.
>
> Enable semble? **(yes / no)**

**If yes:**

1. Check whether it is already registered:
   ```bash
   claude mcp list 2>/dev/null | grep -i semble && echo "already registered" || echo "not registered"
   ```
   If already registered, skip to step 3.

2. Detect the available installer and register the MCP server:
   ```bash
   which uv 2>/dev/null && echo "uv" || (which pip3 2>/dev/null || which pip 2>/dev/null) && echo "pip" || echo "none"
   ```
   - **`uv` found:**
     ```bash
     claude mcp add semble -s user -- uvx --from "semble[mcp]" semble
     ```
   - **`pip` found (no `uv`):** Install semble first, then register with the bare command:
     ```bash
     pip install "semble[mcp]"
     claude mcp add semble -s user -- semble
     ```
     Report:
     > Installed semble via pip. If `semble` is not on `$PATH` after install, you may need to restart your shell or add your pip bin directory to `$PATH`.
   - **Neither found:** Warn the user and skip:
     > Neither `uv` nor `pip` was found. Install one of them and re-run `/cerebro-setup` to enable semble:
     > - **uv (recommended):** `curl -LsSf https://astral.sh/uv/install.sh | sh`
     > - **pip:** ships with Python — install Python from https://python.org
     
     Set semble status to `SKIPPED (no installer)` in the summary and do not create the integration file.

3. Create `.cerebro/integrations/semble.md` with this exact content:

```markdown
# Semble — Semantic Code Search

Semble is installed as an MCP server. Nightcrawler should prefer it over grep for natural-language queries.

## MCP Tools

- `search(query, repo)` — natural-language or identifier search; `repo` is a local path or git URL; defaults to the current working directory.
- `find_related(file_path, line, repo)` — find chunks semantically similar to the code at a given file location.

## When to Use Semble

- Conceptual / natural-language queries → `search`
- "Find code similar to X" → `find_related`
- Exhaustive exact-string or regex matching → use `grep` (semble is not a text matcher)

## Indexing for Repeated Searches

Index once for faster repeated queries:
​```bash
semble index . -o .cerebro/semble-index
​```
Pass `--index .cerebro/semble-index` to searches. Reindex if the codebase changes significantly.
```

4. Report:
   > Semble MCP registered and integration file written to `.cerebro/integrations/semble.md`. Nightcrawler will use it on the next team dispatch.

**If no:** skip silently.

---

### 7. Summary

Print a brief setup report:

```
CLAUDE.md import     — PRESENT | FIXED
cerebro-identity.md  — PRESENT | MISSING
installed version    — <ref> | unknown
latest upstream      — <ref> | unreachable
upgrade needed       — YES | NO | UNKNOWN
semble integration   — ENABLED | SKIPPED | SKIPPED (no installer)
```
