# Orchestration System Guide

Cerebro turns Claude Code into a coordinated agent workflow using native project files: `CLAUDE.md`, `.claude/agents/`, `.claude/commands/`, hooks, and `.cerebro/` runtime state.

## When To Use What

| Complexity | Approach | When to use |
|---|---|---|
| Simple | Ask normally | Explanation, small command, single obvious edit. |
| New repo or stale context | `/cerebro-index` | Build `.cerebro/project-context.md` before planning or execution. |
| Clear implementation | `/to-me-my-x-men [task]` | Clear goal, low/medium risk, no long interview needed. |
| Complex or risky | `/cerebro-plan [task]` then `/cerebro-start-work` | Multi-step feature, architecture change, migration, security, data, production impact. |
| Interrupted plan | `/cerebro-start-work` | Continue from `.cerebro/boulder.json`. |

## Layers

1. Cerebro classifies the user request and reads `.cerebro/project-context.md` when it exists.
2. Professor X plans complex or risky work and writes `.cerebro/plans/{name}.md`.
3. Cyclops executes plans by delegating to Wolverine, Storm, Forge, Nightcrawler, and Sage.
4. Workers report results; Cyclops verifies independently.
5. State and focused notepads are stored under `.cerebro/`.

## Verification Standard

Worker self-report is not enough. Cyclops verifies by reading changed files, running the plan's verification commands, and sending failures back to the worker with exact output.
