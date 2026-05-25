# Agent Mapping

This template uses X-Men names for Claude Code specialist prompts.

| Agent | Role | Write boundary |
|---|---|---|
| Cerebro | Main orchestrator and intent gate | Avoids code edits; delegates implementation |
| Professor X | Strategic planner and interviewer | `.cerebro/plans/` only |
| Beast | Gap analyst and plan critic | Read-only |
| Emma Frost | Plan validator | Read-only |
| Cyclops | Execution coordinator | Runtime state and notepads |
| Wolverine | General implementation and tests | Codebase, excluding `.cerebro/plans/` |
| Forge | Architecture consultant | Read-only |
| Nightcrawler | Codebase traversal and pattern search | Read-only |
| Sage | Documentation and knowledge retrieval | Read-only |
| Storm | Frontend and visual engineering | UI/frontend files |

## Runtime Files

```text
.claude/
├── agents/
├── commands/
│   ├── cerebro-plan.md
│   ├── cerebro-start-work.md
│   ├── cerebro-upgrade.md
│   ├── cerebro-doctor.md
│   ├── cerebro-index.md
│   └── to-me-my-x-men.md
└── hooks/

.cerebro/
├── schemas/
├── templates/
├── project-context.md
├── plans/
└── notepads/
```
