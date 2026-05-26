# Cerebro Upgrade — Versioned Template Sync

Sync template-owned files from the upstream `claude-xmen` repo at a user-chosen tagged release.

## Instructions for Cerebro

This is a **Cerebro-led single-flow operation**. Do NOT create an agent team. Do NOT touch `.cerebro/.pending-todos`. Do NOT spawn Wolverine or Storm. Handle everything directly, like `/cerebro-doctor`.

Upstream remote: `https://github.com/yelaco/claude-xmen.git`

---

### 1. Parse and Validate Arguments

Parse `$ARGUMENTS` as: `[<ref>] [--dry-run] [--strict] [--only <glob>]`

- `<ref>` — optional. A git tag or commit SHA (e.g. `v0.3.0`, `abc1234`). Must be explicit — no branch names, no `HEAD`, no `main`, no `master`. If omitted, the latest upstream tag is resolved automatically (see below).
- `--dry-run` — produce the change report without writing any files.
- `--strict` — pause Gate C before overwriting any template-owned file whose local content has drifted from the recorded baseline.
- `--only <glob>` — restrict the upgrade to files matching this glob pattern.

Abort immediately with a clear error if:
- `<ref>` is explicitly given as `HEAD`, `main`, or `master` — upgrades must reference an explicit release for reproducibility.

**If `<ref>` is omitted**, resolve the latest upstream tag:

```bash
git ls-remote --tags --sort=-version:refname \
  https://github.com/yelaco/claude-xmen.git \
  'refs/tags/v*' | head -1 | sed 's|.*refs/tags/||'
```

If the command fails or returns no tags, abort with:
`Could not resolve the latest upstream tag — specify a ref explicitly (e.g. /cerebro-upgrade v0.3.0).`

Otherwise, display the resolved tag to the user:

> **Latest upstream release: `<resolved-tag>`**
> Proceed with `/cerebro-upgrade <resolved-tag>`?

Use `AskUserQuestion` (or equivalent confirmation prompt) with options **Proceed** and **Cancel**. If the user cancels, abort with no further action. If the user confirms, set `<ref>` to the resolved tag and continue.

---

### 2. Gate D — Dirty Working Tree

Before any write, check for uncommitted changes:

```bash
git status --porcelain
```

If any tracked file that matches a `template`-owned or `merge`-owned manifest entry has uncommitted changes, pause and ask the user to commit or stash those changes first, or pass `--force-dirty` to acknowledge the risk.

If `--force-dirty` is passed, warn that rollback via `git restore .` may mix local and upstream changes, then continue.

---

### 3. Manifest Bootstrap (absent manifest only)

Check if `.cerebro/upgrade-manifest.json` exists.

If absent, run the bootstrap flow:
- Generate the default manifest from the canonical ownership list below.
- Present the generated manifest to the user.
- Require explicit user confirmation before continuing.
- Write the confirmed manifest to `.cerebro/upgrade-manifest.json`.

Canonical defaults:
- **template** (overwrite silently): `.claude/agents/*.md`, `.claude/commands/cerebro-*.md`, `.claude/commands/to-me-my-x-men.md`, `.claude/hooks/*.sh`, `.cerebro/schemas/*.json`, `.cerebro/templates/*.md`, `.cerebro/templates/*.json`, `.cerebro/cerebro-identity.md`, `.claude/commands/cerebro-upgrade.md`
- **merge** (review conflicts, Gate A): `.claude/settings.json`, `.cerebro/docs/*.md`
- **user** (never touched): `CLAUDE.md`, `README.md`, `.cerebro/plans/**`, `.cerebro/notepads/**`, `.cerebro/boulder.json`, `.cerebro/.pending-todos`, `.cerebro/team-runs/**`, `.cerebro/project-context.md`

If the manifest is present, load it as-is. The local manifest's ownership entries are authoritative for this run.

---

### 4. Fetch Upstream at `<ref>`

Check if `.cerebro/upgrade-cache/<ref>/` already exists:

```bash
if [ -d ".cerebro/upgrade-cache/<ref>" ]; then
  git -C .cerebro/upgrade-cache/<ref> fetch --depth=1 origin tag <ref>
  git -C .cerebro/upgrade-cache/<ref> checkout <ref>
else
  git clone --filter=blob:none --depth=1 --branch <ref> \
    https://github.com/yelaco/claude-xmen.git \
    .cerebro/upgrade-cache/<ref>/
fi
```

If `git` is unavailable, abort with: `git is required for /cerebro-upgrade — install git and retry`.

If the ref does not exist upstream, abort with a clear error showing the ref and the upstream remote URL.

---

### 5. Resolve `<ref>` to a Full SHA

```bash
git -C .cerebro/upgrade-cache/<ref> rev-parse HEAD
```

Store this SHA as `applied_sha` for the state file.

---

### 6. Load Baseline

If `.cerebro/upgrade-state.json` exists, load its `hashes` map. These hashes represent the committed content of each file at the time of the last successful upgrade.

Use committed-content hashes, not working-tree hashes:

```bash
git show HEAD:<path> | sha256sum
```

If `.cerebro/upgrade-state.json` is absent (first run), treat every file as having no known baseline — all diffs are two-way comparisons between current local content and upstream content.

---

### 7. Classify Each File

For each entry in the local manifest, expand the glob pattern against both:
- The upstream cache at `.cerebro/upgrade-cache/<ref>/`
- The local working tree

If `--only <glob>` is set, skip files that do not match it.

Classify each file path as one of:

| Class | Condition |
|---|---|
| `noop` | Local and upstream content are identical |
| `add` | File exists upstream but not locally (including deliberately-deleted local files) |
| `delete` | File exists locally but not upstream, and is `template`-owned |
| `modify-template` | `template`-owned; content differs between local and upstream |
| `modify-merge-clean` | `merge`-owned; only upstream changed since baseline (or first run with only local content differing) |
| `modify-merge-conflict` | `merge`-owned; both local and upstream have changed since baseline |

Files matching `user`-owned patterns (or patterns not in the manifest) are always classified `user-skip` and excluded from the report entirely.

---

### 8. Apply Template Writes

For each file classified `add`, `delete`, or `modify-template`:

- In default mode: write the upstream content silently, no prompt.
- If `--strict` is set and the local hash has drifted from the recorded baseline hash, fire **Gate C** before writing.

**Gate C — Strict-mode template overwrite:** Present the file path and a one-line summary of what changed. Ask: `overwrite with upstream` or `skip`. Required only when `--strict` is active and local content diverges from baseline.

For `add` files: create any missing parent directories, then write the file.
For `delete` files: remove the local file and note it in the change report.

Note in the change report for any modified `.claude/hooks/*.sh` file: executable bit (`chmod +x`) must be set manually — v1 does not restore file mode bits.

In `--dry-run` mode, skip all writes.

---

### 9. Handle Merge-Owned Conflicts

For each file classified `modify-merge-conflict`:

Fire **Gate A — Merge-owned file conflict:**

1. Show a unified diff between the local file and the upstream file:
   ```bash
   diff -u <local_path> .cerebro/upgrade-cache/<ref>/<path>
   ```
2. Ask the user to choose one of four resolutions:
   - **`keep local`** — leave the local file unchanged; record as `skipped` in change report.
   - **`take upstream`** — overwrite with upstream content; record as `replaced` in change report.
   - **`merge manually`** — write both versions side by side with conflict markers (`.rej`-style), leave for manual resolution; record as `conflict-markers` in change report.
   - **`skip`** — identical to `keep local`; record as `skipped`.

For each file classified `modify-merge-clean` (only upstream changed): apply the upstream content silently. Record as `updated` in change report.

In `--dry-run` mode, show what Gate A would fire for, but do not prompt or write.

---

### 10. Emit the Change Report

Print the change report to chat. Also write it to `.cerebro/upgrade-cache/<ref>/report.md`.

Format:

```
## /cerebro-upgrade <ref> — Change Report

Applied SHA: <applied_sha>
Applied at: <timestamp>
Mode: [dry-run | live]

| File | Class | Action |
|---|---|---|
| <path> | add | written |
| <path> | modify-template | overwritten |
| <path> | modify-merge-conflict | kept local (Gate A: keep local) |
| <path> | modify-merge-clean | updated |
| <path> | noop | — |
```

For every `merge`-owned file skipped due to having only local changes (no upstream change — classified `user-local-only`), add a one-line diff hint:
```
skipped (local-only) — run: diff <local_path> .cerebro/upgrade-cache/<ref>/<path>
```

If zero files changed, state: `All files are up to date — no changes applied.`

---

### 11. Gate B — Manifest Update

After file sync, compare the local `.cerebro/upgrade-manifest.json` with the upstream manifest at `.cerebro/upgrade-cache/<ref>/.cerebro/upgrade-manifest.json`.

If they differ, fire **Gate B** and ask the user to choose:
- **`adopt upstream`** — replace local manifest entirely with upstream version.
- **`merge entries`** — union of ownership entries (upstream entries added, existing local entries preserved).
- **`leave local`** — keep the local manifest unchanged.

In `--dry-run` mode, report the diff but do not prompt or write.

---

### 12. Write `.cerebro/upgrade-state.json` (Atomically)

In live mode (not `--dry-run`), write the state file using a tempfile+rename for atomicity:

```bash
tmp=$(mktemp .cerebro/upgrade-state.XXXXXX.json)
# write JSON to $tmp
mv "$tmp" .cerebro/upgrade-state.json
```

State file contents:

```json
{
  "version": 1,
  "applied_ref": "<ref>",
  "applied_sha": "<40-char hex SHA>",
  "applied_at": "<ISO-8601 timestamp>",
  "hashes": {
    "<path>": "<sha256 hex of committed content after upgrade>"
  }
}
```

The `hashes` map must cover every `template`-owned and `merge`-owned file present in the local tree after the upgrade. Use committed-content hashes (`git show HEAD:<path> | sha256sum`) — not working-tree hashes.

In `--dry-run` mode, skip this step entirely.

---

### 13. Ensure `.cerebro/upgrade-cache/` Is in `.gitignore`

```bash
grep -qF '.cerebro/upgrade-cache/' .gitignore || echo '.cerebro/upgrade-cache/' >> .gitignore
```

Run this in live mode even if `--dry-run` is set (it is a one-time idempotent safety measure).

---

### 14. Final Summary

Report:
- Total files written, updated, skipped, and no-op.
- Any Gate A resolutions chosen.
- Whether the manifest was updated (Gate B).
- Path to `.cerebro/upgrade-state.json`.
- Any hooks that need `chmod +x`.
- Known gaps: v1 does not support automated rollback after partial success (use `git restore .`), does not preserve symlinks or executable bits, and does not support upgrading from a fork with a different remote.
