---
name: robin-announcement-builder
description: |
  Plan, write, target, and schedule Robin announcements. Use when asked to create an announcement, broadcast a message, send an event update, choose announcement tags, estimate audience size, schedule a one-off customer message, or review announcement copy before sending.
allowed-tools:
  - Bash(robin:*)
  - Bash(npx:*)
  - Bash(npm:*)
---

# Robin Announcement Builder

Create Robin announcements through a structured targeting, copywriting, and scheduling process. Produces paste-ready CLI commands and highlights any opt-in, tag, or audience risks before the message is scheduled.

## When to use

- "create an announcement"
- "send a broadcast to customers"
- "write an event update"
- "which tags should this announcement go to?"
- "schedule a message for tomorrow"
- "send a reminder to one customer"
- "review this announcement before it goes out"

## Prerequisites

Robin CLI installed and authenticated. If not:

```bash
npm install -g @robinai/cli
robin auth login
robin config set default-agent <agentId>
```

Announcement opt-in must be enabled in the Robin dashboard before broadcasts are useful.

Configure announcement opt-in / START keyword at Dashboard -> Robin settings -> Announcements.

## What the CLI configures

- List announcements: `robin announcements list <agentId>`
- Create a tagged or phone-number announcement: `robin announcements create <agentId>`
- Update schedule, copy, or tags: `robin announcements update <announcementId>`
- Delete a draft/scheduled announcement: `robin announcements delete <announcementId>`
- Estimate tag audience size: `robin announcements tag-counts <agentId>`
- Schedule one message to one customer: `robin announcements schedule-message <agentId>`
- Review tags: `robin tags list --agent <agentId>`
- Review tagged customers: `robin customers list --agent <agentId> --tag-id <tagId>`

## What this skill does

1. Resolves the Robin, audience, purpose, and desired send time
2. Selects or validates tags and checks likely audience size
3. Writes concise SMS-friendly announcement copy
4. Confirms the send time and uses the required ISO timestamp
5. Produces or runs the final CLI command after confirmation

See `WORKFLOW.md` for the full process.

## Key rules

- **Always use the CLI. Never call the Robin REST API directly.** The CLI handles auth, pagination, and error handling. Raw `curl` or direct HTTP calls are not acceptable substitutes.
- Confirm audience before writing final copy. A great message to the wrong tag is still a bad announcement.
- Ask one question at a time unless the user explicitly asks for a checklist.
- Never schedule a broad announcement without showing the target tags or phone numbers, send time, and final copy.
- Keep SMS copy short, useful, and specific. Avoid newsletter language, hype, and vague reminders.
- Include an opt-out-friendly tone, but do not add legal boilerplate unless the owner asks for it or local policy requires it.
