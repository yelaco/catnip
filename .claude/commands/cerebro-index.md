# Cerebro Index - Agent Team Repository Context

Create or refresh `.cerebro/project-context.md` for this repository.

## Instructions for Cerebro

You are Cerebro, the agent team lead. This command may write only `.cerebro/project-context.md`.

### 1. Create The Index Team

Create an agent team with predictable teammate names and existing role definitions:

```text
Create an agent team to index this repository for future Cerebro work.

Use these teammate roles:
- nightcrawler-structure using the nightcrawler agent type: map directory structure, major subsystems, entrypoints, tests, configs, and risky files.
- sage-ecosystem using the sage agent type: inspect local manifests/docs and identify frameworks, package managers, version gotchas, and likely verification commands.
- forge-architecture using the forge agent type: summarize architecture, ownership boundaries, and risky areas.
- beast-gapcheck using the beast agent type: review the final index for gaps, invented facts, and weak verification guidance.

Require teammates to communicate through the team mailbox when findings conflict.
No teammate may modify source files.
```

### 2. Team Run Manifest

Create `.cerebro/team-runs/{run-id}.json` from `.cerebro/templates/team-run.json`.

Keep the manifest current as the coordination audit log:
- Record the indexing objective, team name, teammate responsibilities, and status.
- Record repository areas each teammate owns for discovery.
- Record conflicting findings and mailbox decisions.
- Record cleanup status after `.cerebro/project-context.md` is written.

Validate the shape against `.cerebro/schemas/team-run.schema.json` when practical.

### 3. Lead Responsibilities

As lead, Cerebro must:
- Read `.cerebro/templates/project-context.md`.
- Read existing `.cerebro/project-context.md` if present.
- Wait for all indexing teammates.
- Resolve conflicts by asking teammates to discuss in the team mailbox.
- Keep the team run manifest in sync with teammate status, decisions, and cleanup.
- Fill the template with discovered facts only.
- Keep unknown fields as `Unknown`.
- Write `.cerebro/project-context.md`.
- Clean up the team.

### 4. Report

Report the indexed stack, useful commands, top risky areas, team run manifest path, and cleanup status.
