# Cerebro Claude Code Template

Cerebro is a Claude Code agentic workflow template. It gives one project a repeatable planning and execution system using native Claude Code files:

- `CLAUDE.md` for the main Cerebro behavior
- `.claude/agents/*.md` for specialist personas
- `.claude/commands/*.md` for slash command workflows
- `.claude/hooks/check-pending-todos.sh` for stop-hook enforcement
- `.cerebro/` for plans, execution state, and accumulated learnings

Skills are optional overlays. The base workflow does not require any skill to be installed.

## Quick Start

```text
/to-me-my-x-men add request validation to the API
/cerebro-index
/cerebro-plan redesign the authentication flow
/cerebro-start-work
/cerebro-doctor
```

## Working Modes

| Mode | Command | Use when |
|---|---|---|
| Direct | Ask normally | The request is simple and low-risk. |
| Index | `/cerebro-index` | Build project context for faster future work. |
| Autonomous | `/to-me-my-x-men [task]` | The task is clear and should be executed end to end. |
| Planning | `/cerebro-plan [task]` | Requirements are complex, ambiguous, high-impact, or need approval. |
| Execution | `/cerebro-start-work` | A plan exists and should be executed or resumed. |
| Doctor | `/cerebro-doctor` | Validate workflow health and catch command/model/effort drift. |

## Recommended Reading

- [Cerebro Workflow](./cerebro-workflow.md)
- [Orchestration Guide](./orchestration.md)
- [Skill Policy](./skill-policy.md)
- [Agent Mapping](./agent-mapping.md)
