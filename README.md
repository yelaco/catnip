# Claude X-Men — Cerebro Orchestration Template

A self-contained Claude Code multi-agent orchestration template. Copy it into any project and get a full 9-agent AI team with planning, execution, enforcement, and session continuity — all themed around the X-Men.

Cerebro coordinates. Agents execute. You get results.

---

## Quick Start

Copy the template into your project:

```bash
# From your project root
cp -r /path/to/claude-xmen/.claude .claude
cp -r /path/to/claude-xmen/.cerebro .cerebro
cp /path/to/claude-xmen/CLAUDE.md CLAUDE.md
```

Open Claude Code and run your first command:

```
/to-me-my-x-men add a REST API for user authentication
```

Cerebro will assemble the team, research your codebase, and execute — no further input required.

---

## Commands

| Command | What it does |
|---|---|
| `/to-me-my-x-men [task]` | Full autonomous mode. Cerebro creates an agent team, assigns teammates, lets them coordinate, then verifies and synthesizes the result. |
| `/cerebro-plan [task]` | Interview-based planning. Cerebro creates a planning team so Professor X, Nightcrawler, Sage, Forge, Beast, and Emma Frost can coordinate. |
| `/cerebro-start-work` | Execute the latest plan. Cerebro creates an execution team coordinated by Cyclops. |
| `/cerebro-doctor` | Validate command names, native agent configuration, plan/state schemas, task result hooks, and stop hook health. |
| `/cerebro-index` | Build `.cerebro/project-context.md` with an indexing team. |
| `/cerebro-upgrade <ref>` | Sync template-owned files from the upstream repo at a tagged release. Presents diffs for merge-owned files; gates all writes. Supports `--dry-run`, `--strict`, and `--only <glob>`. |

---

## The Team

| Agent | Role | Triggers when |
|---|---|---|
| **Professor X** | Strategic planner | Cerebro needs a canonical plan draft |
| **Beast** | Gap analyst | A plan is drafted; checks for missing cases |
| **Emma Frost** | Plan reviewer | High-stakes work; validates OKAY or REJECT |
| **Cyclops** | Execution sequencer | Cerebro needs task order, gate checks, state patches, or verification decisions |
| **Wolverine** | Code writer | Any code, tests, or bug fixes are needed |
| **Storm** | Frontend engineer | UI, components, visual engineering |
| **Forge** | Architecture consultant | Design decisions, system structure |
| **Nightcrawler** | Codebase searcher | Recon before execution; grep, pattern discovery |
| **Sage** | Docs & knowledge | Library research, API lookup, best practices |

Every non-trivial workflow uses an agent team so teammates can share a task list and talk to each other. Cerebro also writes a team run manifest so ownership, mailbox decisions, verification, and cleanup are auditable. Trivial questions are answered directly.

---

## How It Works

```
User
 │
 ▼
Cerebro (CLAUDE.md, team lead)
 │
 ├── /to-me-my-x-men ──► Agent Team
 │                         ├── cyclops-field (task list / gates)
 │                         ├── nightcrawler-recon (codebase)
 │                         ├── sage-research (docs)
 │                         ├── forge-architecture (design)
 │                         ├── wolverine-implementation (code/tests)
 │                         ├── storm-ui (frontend)
 │                         ├── beast-review (gaps)
 │                         └── emma-validation (high-risk)
 │
 ├── /cerebro-plan ──► Planning Agent Team
 │                              │
 │                              ▼
 │                    .cerebro/plans/{name}.md
 │
 └── /cerebro-start-work ────► Execution Agent Team
```

### Session Continuity

Every plan execution is tracked in `.cerebro/boulder.json`. If Claude Code stops mid-task, `/cerebro-start-work` resumes exactly where it left off:

```
"Resuming auth-api-plan — 3 of 7 tasks complete"
```

Every team workflow also writes `.cerebro/team-runs/{run-id}.json`. The run manifest records teammates, file ownership, task state, mailbox decisions, approvals, verification, and cleanup status. Native team lifecycle hooks append task and idle events to `.cerebro/team-runs/events.jsonl`.

### Wisdom Accumulation

After each delegated task, learnings are written to focused files under `.cerebro/notepads/{plan-name}/` — conventions found, approaches that worked, gotchas hit, and verification outcomes. Subsequent team assignments receive only the relevant accumulated context.

### Todo Enforcement

A stop hook blocks Claude from sending a final response while `.cerebro/.pending-todos` has content. Wolverine and Storm write todos at task start and remove them on completion. No silent abandonment.

---

## File Structure

```
.
├── CLAUDE.md                          # Cerebro — main agent identity
├── .claude/
│   ├── settings.json                  # Wires hooks, permissions, and team env
│   ├── agents/                        # 9 native teammate definitions
│   │   ├── professor-x.md
│   │   ├── beast.md
│   │   ├── emma-frost.md
│   │   ├── cyclops.md
│   │   ├── wolverine.md
│   │   ├── storm.md
│   │   ├── forge.md
│   │   ├── nightcrawler.md
│   │   └── sage.md
│   ├── commands/                      # Slash commands
│   │   ├── cerebro-doctor.md
│   │   ├── cerebro-index.md
│   │   ├── cerebro-plan.md
│   │   ├── cerebro-start-work.md
│   │   ├── cerebro-upgrade.md
│   │   └── to-me-my-x-men.md
│   └── hooks/
│       ├── check-pending-todos.sh        # Stop hook — enforces todo completion
│       ├── check-task-result-envelope.sh # SubagentStop hook — enforces TASK_RESULT
│       └── log-team-event.sh             # Team hooks — logs task/idle events
└── .cerebro/
    ├── schemas/
    │   ├── boulder.schema.json        # Execution state schema
    │   ├── team-run.schema.json       # Agent team run manifest schema
    │   ├── upgrade-manifest.schema.json  # Upgrade manifest schema
    │   └── upgrade-state.schema.json  # Upgrade state baseline schema
    ├── templates/
    │   ├── plan.md                    # Canonical Professor X plan schema
    │   ├── project-context.md         # Canonical repository index schema
    │   └── team-run.json              # Agent team run manifest template
    ├── upgrade-manifest.json          # File ownership for /cerebro-upgrade
    ├── project-context.md             # Repository index created by /cerebro-index
    ├── plans/                         # Plans written by Cerebro from Professor X drafts
    ├── notepads/                      # Per-plan wisdom (learnings, decisions)
    ├── team-runs/                     # Per-team coordination audit logs
    ├── upgrade-cache/                 # Shallow upstream clones (gitignored)
    └── boulder.json                   # Execution state (created at /cerebro-start-work)
```

---

## Four Ways to Work

**0. Index a project**

Best when copying Cerebro into a repo for the first time or after major project changes.

```
/cerebro-index
```

Cerebro writes `.cerebro/project-context.md` with stack, entrypoints, commands, conventions, and risky areas.

**1. Autonomous (fire and forget)**

Best for clear tasks where you trust the team to figure out the details.

```
/to-me-my-x-men migrate the database layer from raw SQL to Prisma
```

Cerebro creates an agent team and team run manifest. Nightcrawler maps the codebase, Sage researches Prisma, Cyclops maintains the shared task list, Wolverine and Storm implement partitioned work, and reviewers challenge the result. You get a completion report.

**2. Interview-first (high confidence)**

Best for complex features where requirements need to be locked down before a line is written.

```
/cerebro-plan redesign the notification system to support real-time push
```

Cerebro interviews you, Professor X drafts the plan, Beast finds the gaps, and Emma Frost validates high-risk plans. Then:

```
/cerebro-start-work
```

Cerebro executes the written plan with Cyclops sequencing and full checkpoint tracking.

**3. Direct role selection**

Tab-complete to any role in Claude Code for targeted use, but Cerebro workflows use teams by default.

---

## Configuration

Hooks are registered in `.claude/settings.json`:

```json
{
  "hooks": {
    "SubagentStop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/check-task-result-envelope.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/check-pending-todos.sh"
          }
        ]
      }
    ],
    "TaskCreated": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/log-team-event.sh"
          }
        ]
      }
    ],
    "TaskCompleted": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/log-team-event.sh"
          }
        ]
      }
    ],
    "TeammateIdle": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/log-team-event.sh"
          }
        ]
      }
    ]
  }
}
```

Project settings allow common tools and deny sensitive reads such as `.env*` plus generated build output writes. Individual teammate role tool boundaries live in `.claude/agents/*.md`.

Agent teams are enabled for this template:

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Agent teams require Claude Code v2.1.32 or later and are experimental. Cerebro uses them for every non-trivial workflow so teammates can coordinate through a shared task list and mailbox.

### Native Agent Configuration

Agent model, effort, and tool boundaries live in each native role frontmatter. Agent teams reuse those role definitions for teammates.

### Skills

Skills are optional overlays. The template ships without required skills; users can add skills later without changing the base workflow. Project-local `.cerebro` contracts, approval gates, todo discipline, native agent boundaries, and result envelopes remain authoritative.

---

## Requirements

- Claude Code v2.1.32 or later for agent teams
- A project with a git repo (recommended)
- No additional dependencies — pure Claude Code primitives
