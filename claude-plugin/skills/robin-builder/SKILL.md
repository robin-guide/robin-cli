---
name: robin-builder
description: |
  Build or configure a Robin agent from scratch. Runs discovery to understand the use case, then configures knowledge, goals, websites, and tone. Use when asked to set up a Robin, build a Robin for an event or venue, configure a Robin's knowledge base or persona, or tune how a Robin responds.
allowed-tools:
  - Bash(robin:*)
  - Bash(npx:*)
  - Bash(npm:*)
---

# Robin Builder

Configure a Robin agent through a structured discovery-and-build process. Produces paste-ready configuration applied directly via the CLI, with guidance on what to set in the Robin dashboard. To validate Robin's replies after building, use [`conversation-assessment`](../robin-conversation-assessment/SKILL.md).

## When to use

- "set up a Robin for [event / venue / use case]"
- "build a Robin from scratch"
- "configure my Robin's knowledge base"
- "update how my Robin talks"
- "tune my Robin for [audience]"

## Prerequisites

Robin CLI installed and authenticated. If not:

```bash
npm install -g @robinai/cli
robin auth login
robin config set default-agent <agentId>
```

If creating a new Robin, a **team ID is required**. Run `robin teams list` to see available teams and confirm which one to use. Never create a Robin without assigning it to a team.

## What the CLI configures

| What | CLI command |
|------|-------------|
| Knowledge base (what the Robin knows) | `robin agents update --user-instructions` |
| Goals and persona (who the Robin is) | `robin agents update --goal-instructions` |
| Timezone | `robin agents update --time-zone` |
| Website knowledge sources | `robin websites add / remove / configure` |

## What requires the Robin dashboard

Some components are toggled or connected in [app.robin.guide](https://app.robin.guide) — the CLI can't reach them yet. Once connected, their *behavior* is typically controlled via `--user-instructions`.

| Component | Configure at |
|-----------|-------------|
| Personality sliders (Casual↔Formal, Verbose↔Concise) | Dashboard → Robin settings |
| Announcement opt-in (START keyword) | Dashboard → Robin settings |
| "Tell me if stumped" notifications | Dashboard → Robin settings |
| Keyword / mention alerts | Dashboard → Robin settings |
| Mailchimp integration | Dashboard → Integrations |
| Google Calendar (BETA) | Dashboard → Integrations |
| Notion | Dashboard → Integrations |
| ShowPass | Dashboard → Integrations |

For integrations: once connected in the dashboard, describe how Robin should use them inside `--user-instructions` (e.g. when to query Notion, what fields to use).

## What this skill does

1. Runs a short discovery conversation — one question at a time
2. Applies the Pre-Flight Checklist before writing any config
3. Produces and applies configuration via CLI
4. Flags anything that needs a manual dashboard step

See `WORKFLOW.md` for the full process.

## Key rules

- Say "Robin", not "agent" — that's how owners know their AI.
- One question at a time. Don't front-load a list of everything needed.
- Always apply the Pre-Flight Checklist (in `WORKFLOW.md`) before configuring anything.
- Always include `--commit-message` on updates — it's stored in the audit log.
- Produce paste-ready config. No "copy this block" wrapping in the output.
