---
name: robin
description: |
  Interact with Robin AI agents using the Robin CLI. Use for any task involving Robin agents: configuring knowledge and goals, managing websites and customers, reviewing conversations, testing an agent, sending announcements, or managing tags and invitations. This is the primary entry point for all Robin CLI work.
allowed-tools:
  - Bash(robin:*)
  - Bash(npx:*)
  - Bash(npm:*)
metadata:
  url: https://robin.guide
  requires:
    bins:
      - robin
  install:
    - kind: node
      package: "@robinai/cli"
      bins: [robin]
---

# Robin CLI

Scriptable access to the Robin platform. Built for humans and AI agents alike.

## Setup

### 1. Install

```bash
# Check if already installed
robin --version 2>/dev/null || npm install -g @robinai/cli
```

### 2. Authenticate

```bash
robin auth status
```

If not authenticated:

```bash
# Interactive (prompts for API key and URL)
robin auth login

# Non-interactive (CI / scripted)
robin auth login --key robin_xxx --url https://api.robin.guide
```

API keys are generated at [app.robin.guide](https://app.robin.guide) → Settings → API Keys.

### 3. Set a default agent

```bash
# List available agents
robin agents list --json

# Set default — avoids passing --agent on every command
robin config set default-agent <agentId>
```

Once set, all commands use it automatically. Override per-command with `--agent <id>`.

---

## Agent Output for Scripts and AI Agents

Pass `--json` to any command for clean, machine-readable output:

```bash
robin agents list --json
robin customers list --json | jq '.[].name'
```

---

## Capabilities

### Configure a Robin

Robin agents have two distinct instruction fields:

| Field | Purpose |
|-------|---------|
| `userInstructions` | What the Robin **knows** — facts, policies, product info, grounding knowledge |
| `goalInstructions` | Who the Robin **is** — goals, tone, persona, behavioral directives |

Update either field:

```bash
# Update knowledge base
robin agents update <agentId> \
  --user-instructions "Your full knowledge content here." \
  --commit-message "Updated knowledge base"

# Update goals / persona
robin agents update <agentId> \
  --goal-instructions "You are a friendly concierge for Feather Fest..." \
  --commit-message "Refined persona"
```

Read the current configuration first:

```bash
robin agents get <agentId> --json
```

Always include `--commit-message` — it's stored in the audit log.

### Manage web crawler websites

```bash
# List current websites
robin websites list <agentId> --json

# Add a website
robin websites add <agentId> --url https://example.com \
  --description "Event FAQ page. Resource types: hours, parking, lineup"

# Remove a website
robin websites remove <agentId> <websiteId> --yes

# Enable or disable the web crawler
robin websites configure <agentId> --enabled true
```

A good website `--description` tells the Robin what the site is and what to use it for, followed by `Resource types:` listing the key content types.

### Manage customers

```bash
# List customers
robin customers list --json

# Get a customer
robin customers get <customerId> --json

# Create a customer
robin customers create --name "Jane Smith" --phone "+15551234567"

# Update a customer
robin customers update <customerId> --name "Jane Smith"

# Bulk import from CSV
robin customers bulk-import --file customers.csv
```

### Review and reply to conversations

```bash
# Get a thread
robin conversations get <threadId> --json

# Reply
robin conversations reply <threadId> --content "Here's what you need to know..."

# Pause AI for a thread (human takeover)
robin conversations pause <threadId>

# Resume AI
robin conversations resume <threadId>
```

To list all threads for an agent:

```bash
# Paginated — use nextCursor for subsequent pages
robin agents threads <agentId> --page-size 50 --json
robin agents threads <agentId> --page-size 50 --cursor <nextCursor> --json
```

### Test an agent

Open an interactive chat session on the same channel the Robin web app uses:

```bash
robin chat
robin chat <agentId>
```

Controls: type + Enter to send, `/reset` to clear history, Esc or `/quit` to exit.

### Manage announcements

```bash
robin announcements list --json
robin announcements create --content "Doors open at 7pm tonight!" --agent <agentId>
robin announcements schedule-message <announcementId> --send-at "2025-06-01T19:00:00Z"
```

### Manage tags

```bash
robin tags list --json
robin tags create --name "VIP"
robin tags assign <tagId> --customer <customerId>
robin tags unassign <tagId> --customer <customerId>
```

### Manage invitations

```bash
robin invitations list --json
robin invitations create --email user@example.com
robin invitations revoke <invitationId> --yes
```

---

## Sub-skills

For more complex workflows, see:

| Task | Skill |
|------|-------|
| Analyze conversations and produce a quality report | [`skills/conversation-assessment/SKILL.md`](./conversation-assessment/SKILL.md) |

---

## Reference

- [Getting Started](../docs/getting-started.md)
- [Full Command Reference](../docs/reference.md) — every flag and endpoint documented
