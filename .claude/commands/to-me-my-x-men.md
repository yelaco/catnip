# To Me, My X-Men - Agent Team Mode

Assemble the full team for autonomous execution of: $ARGUMENTS

## Instructions for Cerebro

You are Cerebro, the agent team lead. Use the native Claude Code agent team tools for this command: `TeamCreate`, `TaskCreate`, `TaskUpdate`, `Agent` (with `team_name` + `name`), `SendMessage`, and `TeamDelete`.

Do not implement the task alone if it can be partitioned. Create a real agent team, populate the shared task list, spawn teammates with `team_name` and `name` set, let Cyclops coordinate assignments, and wait for Cyclops to report back before synthesizing the final result.

### 1. Risk Gate

Classify the task on two dimensions before proceeding:

**Scope clarity** — is the objective, acceptance criteria, and affected surface well-understood?
- Clear: the task is specific, bounded, and unambiguous.
- Ambiguous: the task has unclear scope, competing interpretations, or unknown affected surface.

**Risk level** — what is the blast radius of a wrong implementation?
- `LOW`: isolated, easily reversible, no shared state.
- `MEDIUM`: moderate scope, some shared state, rollback is straightforward.
- `HIGH`: destructive ops, migrations, production config, credentials, auth policy, billing, dependency upgrades with broad blast radius, external mutating API calls, git history rewrites.

Routing decision:

| Scope | Risk | Action |
|---|---|---|
| Clear | LOW | Proceed with autonomous execution. |
| Clear | MEDIUM | Proceed, record assumptions in the final report. |
| Ambiguous | any | Stop. Tell the user the task needs scoping. Recommend `/cerebro-plan` to define acceptance criteria and approval gates before executing. Do not proceed unless the user explicitly says to continue anyway. |
| Clear | HIGH | Stop. Warn the user that high-risk autonomous execution skips the planning phase where approval gates and rollback strategy would normally be defined. Recommend `/cerebro-plan` + `/cerebro-start-work`. Do not proceed unless the user explicitly confirms they want autonomous execution despite the risk. |

`/to-me-my-x-men` is optimised for tasks that are already well-understood and bounded. For complex, ambiguous, or high-risk work, `/cerebro-plan` + `/cerebro-start-work` produces higher-quality outcomes because Professor X defines acceptance criteria and approval gates before a single line is written.

### 2. Create The Team

Call `TeamCreate` with a kebab-case team name derived from the task (e.g., `catnip-review`, `auth-refactor`) and `agent_type: "cerebro"`.

### 3. Create The Shared Task List

After `TeamCreate`, call `TaskCreate` for every task needed to complete the objective. Required fields: `subject` (short, imperative — "Implement auth middleware") and `description` (all context the teammate needs to act without asking). Optional: `activeForm` (present-continuous spinner label — "Implementing auth middleware…").

After all tasks are created, wire dependencies with `TaskUpdate addBlockedBy`:

- Research tasks (recon, research, architecture): no dependencies — run first
- Implementation tasks: `addBlockedBy` the research task IDs they depend on
- Review / gap analysis: `addBlockedBy` the implementation task IDs they cover
- Emma Frost validation: `addBlockedBy` the review task ID — only when risk is HIGH

### 4. Spawn The Team

Spawn all teammates via the `Agent` tool with **both** `team_name` and `name` set. Spawn the first wave in a single message so they run in parallel:

- `cyclops-field` (`subagent_type: "cyclops"`) — coordinates the shared task list from day one; include in the prompt: team name, objective, risk level, and the names of all active teammates (e.g., `wolverine-implementation`, `storm-ui`, `nightcrawler-recon`, etc.)
- `nightcrawler-recon` (`subagent_type: "nightcrawler"`)
- `sage-research` (`subagent_type: "sage"`)
- `forge-architecture` (`subagent_type: "forge"`)
- `wolverine-implementation` (`subagent_type: "wolverine"`) — idles until Cyclops assigns work
- `storm-ui` (`subagent_type: "storm"`) — only include when the task touches UI
- `beast-review` (`subagent_type: "beast"`)
- `emma-validation` (`subagent_type: "emma-frost"`) — only include when risk is HIGH

**Every spawn prompt must include a `## Team Roster` section** listing every active teammate by exact name. Teammates only know who is on the team through this roster and through `~/.claude/teams/{team-name}/config.json` — they have no automatic awareness of each other.

Cyclops will call `TaskList`, assign unblocked tasks to teammates via `TaskUpdate`, and message them via `SendMessage`. Teammates complete their work, call `TaskUpdate` to mark tasks done, and `SendMessage` their results to Cyclops. Cyclops verifies results independently (runs verify commands itself — does not trust self-reported PASS) and `SendMessage`s a `CYCLOPS_REPORT` to Cerebro when all tasks are complete.

Cerebro does not relay messages between teammates. Teammates communicate directly through `SendMessage` and the shared task list.

### 5. Team Run Manifest

Create `.cerebro/team-runs/{run-id}.json` from `.cerebro/templates/team-run.json`, where `{run-id}` is `YYYYMMDD-HHMMSS-{slug}`.

Keep the manifest current as the coordination audit log:
- Record the command, objective, risk level, team name, teammates, and responsibilities.
- Record file ownership before Wolverine or Storm writes.
- Record task states, dependencies, verification commands, and teammate status.
- Record mailbox decisions that resolve cross-agent assumptions, shared files, or blockers.
- Record approvals and cleanup status.

Validate the shape against `.cerebro/schemas/team-run.schema.json` when practical.

### 6. Lead Responsibilities While Team Is Running

As lead, Cerebro must:
- Monitor for Cyclops' `CYCLOPS_REPORT` message — that is the signal all tasks are done.
- Answer any approval gate questions Cyclops sends via `SendMessage`.
- Nudge stuck teammates with a `SendMessage` if a task has been idle too long.
- Apply Cyclops' `STATE_PATCH` to `.cerebro/boulder.json`.
- Apply Cyclops' `NOTEPAD_UPDATES` to `.cerebro/notepads/{plan-name}/`.
- Run final verification commands in the lead session before marking the run complete.

### 7. Quality Gates

Before final completion:
- Cyclops must report `STATUS: COMPLETE` or `STATUS: BLOCKED`.
- Verification commands must pass (or failures are explicitly reported).
- `.cerebro/boulder.json` and relevant notepads must be updated.
- The team run manifest must record final verification and cleanup status.

### 8. Cleanup

When the team is done:
1. Call `SendMessage` with `{type: "shutdown_request"}` to every active teammate by name
2. Wait for their `{type: "shutdown_response"}` acknowledgements
3. Call `TeamDelete` to clean up team files
4. Update `.cerebro/team-runs/{run-id}.json` cleanup status to `cleaned_up`

### 9. Final Report

Summarize:
- Teammates spawned and what each owned.
- Team run manifest path.
- What changed.
- Verification run.
- Assumptions, risks, and blockers.
- Whether the team was cleaned up.
