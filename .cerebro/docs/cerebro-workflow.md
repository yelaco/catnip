# Cerebro Agentic Workflow

This is the operational workflow for the Claude Code template.

## Runtime Architecture

```mermaid
flowchart TB
    User["User Request"] --> Gate["Cerebro Intent Gate"]
    Gate -->|"index repo"| Index["Project Index"]
    Gate -->|"simple"| Direct["Direct Response"]
    Gate -->|"complex / risky"| Planning["Professor X Planning"]
    Gate -->|"clear task"| Execution["Cyclops Execution"]
    Planning --> Plan[".cerebro/plans/*.md"]
    Plan --> Execution
    Execution --> Workers["Wolverine / Storm / Forge / Nightcrawler / Sage"]
    Execution --> State[".cerebro/boulder.json + notepads"]
    Execution --> Result["Verified Result"]
    Index --> Context[".cerebro/project-context.md"]
```

## Commands

| Command | Purpose |
|---|---|
| `/to-me-my-x-men [task]` | Autonomous execution for clear tasks. |
| `/cerebro-index` | Build or refresh repository context. |
| `/cerebro-plan [task]` | Interview-first planning with Professor X. |
| `/cerebro-start-work` | Execute or resume the latest Cerebro plan. |
| `/cerebro-doctor` | Validate command names, model/effort routing, agent frontmatter, plan template, and stop hook health. |
| `/cerebro-upgrade <ref>` | Sync template-owned files from the upstream repo at a tagged release. |

## State Files

| Path | Owner | Purpose |
|---|---|---|
| `.cerebro/schemas/boulder.schema.json` | Cyclops | Required shape for resumable execution state. |
| `.cerebro/templates/plan.md` | Professor X | Canonical plan schema. |
| `.cerebro/templates/project-context.md` | Cerebro | Canonical repository index schema. |
| `.cerebro/project-context.md` | Cerebro | Indexed stack, commands, conventions, entrypoints, and risks. |
| `.cerebro/plans/*.md` | Professor X | Approved implementation plans. |
| `.cerebro/boulder.json` | Cyclops | Active plan, completed tasks, remaining tasks, approval state. |
| `.cerebro/notepads/{plan}/conventions.md` | Cyclops | Coding patterns, naming, file structure, UI patterns. |
| `.cerebro/notepads/{plan}/commands.md` | Cyclops | Useful install/test/lint/build/dev commands. |
| `.cerebro/notepads/{plan}/decisions.md` | Cyclops | Approval decisions and architectural decisions. |
| `.cerebro/notepads/{plan}/gotchas.md` | Cyclops | Subtle traps, edge cases, unexpected behavior. |
| `.cerebro/notepads/{plan}/failures.md` | Cyclops | Failed approaches and why. |
| `.cerebro/notepads/{plan}/verification.md` | Cyclops | Verification commands and outcomes. |
| `.cerebro/notepads/{plan}/issues.md` | Cyclops | Blockers, deferred work, unresolved risks. |
| `.cerebro/.pending-todos` | Wolverine / Storm | Active worker todos enforced by the stop hook. |
| `.cerebro/upgrade-manifest.json` | Cerebro | Declares file ownership for `/cerebro-upgrade`. Controls which files are overwritten, merged, or left untouched. |
| `.cerebro/upgrade-state.json` | Cerebro | Baseline hashes written after each successful upgrade. Drives change detection on the next run. |
| `.cerebro/upgrade-cache/<ref>/` | Cerebro | Shallow clones of upstream refs (gitignored). |
| `.cerebro/schemas/upgrade-manifest.schema.json` | Cerebro | JSON Schema for the upgrade manifest. |
| `.cerebro/schemas/upgrade-state.schema.json` | Cerebro | JSON Schema for the upgrade state baseline. |

## Upgrading from Upstream

`/cerebro-upgrade <ref>` syncs template-owned files from the upstream `claude-xmen` repo at an explicit tagged release (e.g. `v0.3.0`). It never touches user-owned paths and gates all writes to merge-owned files.

### How It Works

1. **Arg validation** — `<ref>` must be an explicit tag or SHA; `HEAD`, `main`, and `master` are rejected.
2. **Gate D** — checks for uncommitted changes in template/merge-owned paths before any write.
3. **Fetch** — shallow-clones the upstream repo into `.cerebro/upgrade-cache/<ref>/`.
4. **Classify** — each manifest entry is classified as `add`, `delete`, `modify-template`, `modify-merge-clean`, `modify-merge-conflict`, or `noop` by comparing local vs upstream content against the recorded baseline.
5. **Apply** — template-owned files are written silently; merge-owned conflicts trigger Gate A.
6. **Report** — a change table is printed to chat and written to `.cerebro/upgrade-cache/<ref>/report.md`.
7. **Gate B** — if the upstream manifest differs from the local manifest, the user chooses how to reconcile.
8. **State write** — `.cerebro/upgrade-state.json` is written atomically (tempfile+rename) with the applied SHA and file hashes.

### Approval Gates

| Gate | Trigger | Choices |
|---|---|---|
| **Gate A** | Merge-owned file changed on both sides since baseline | keep local, take upstream, merge manually, skip |
| **Gate B** | Upstream manifest differs from local manifest | adopt upstream, merge entries, leave local |
| **Gate C** | Template-owned file drifted from baseline (`--strict` only) | overwrite, skip |
| **Gate D** | Uncommitted changes in owned paths | commit/stash first, or pass `--force-dirty` |

### Flags

- `--dry-run` — show the change report without writing anything.
- `--strict` — pause Gate C before overwriting any template-owned file that has drifted locally.
- `--only <glob>` — restrict the upgrade to files matching this glob.

### v1 Known Gaps

- No automated rollback after partial success — use `git restore .` to undo any written files.
- Symlinks and executable bits are not preserved. After upgrade, manually run `chmod +x .claude/hooks/*.sh`.
- Only supports the canonical upstream remote (`https://github.com/yelaco/claude-xmen.git`); fork remotes are not supported.

## Skills

Skills are optional overlays. They may improve task-specific execution or verification, but the base workflow must continue without them. `.cerebro` contracts, approval gates, and result envelopes stay authoritative when a skill gives conflicting advice.
