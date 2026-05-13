---
name: robin-contacts-management
description: |
  Manage Robin contacts (customers) and tags. Use for any task involving finding, creating, updating, or tagging contacts — including bulk imports from CSV exports, spreadsheets, or ticketing platforms. Also use when assigning or removing tags, auditing a contact's scheduled messages, or cleaning up tags.
allowed-tools:
  - Bash(robin:*)
  - Bash(npx:*)
  - Bash(npm:*)
  - Bash(python:*)
  - Bash(node:*)
---

# Robin Contacts Management

Create, update, tag, and import contacts for a Robin agent. Covers individual workflows and bulk imports.

> The CLI says `customers` everywhere. Speak to users about **contacts** — that's the brand term.

## When to use

- "add a contact" / "create a customer"
- "import our ticket holders" / "bulk upload contacts"
- "tag all VIPs" / "remove a tag from a contact"
- "create a new tag" / "update a tag's visibility"
- "find a contact by phone or name"
- "show me who's in the VIP tag"
- "what announcements will this contact receive?"
- "clean up tags" / "delete a tag"

## Prerequisites

Robin CLI installed and authenticated. If not:

```bash
npm install -g @robinai/cli
robin auth login
robin config set default-agent <agentId>
```

Confirm the default Robin is set before running any contact commands — contacts and tags are agent-scoped:

```bash
robin config get default-agent
```

---

## Capabilities

### 1. Discover and audit (read-only)

```bash
# List contacts — with optional filters
robin customers list --json
robin customers list --name "Jane" --json
robin customers list --phone "+15551234567" --json
robin customers list --tag-id tag_abc --json
robin customers list --page-size 50 --cursor <nextCursor> --json

# Sort
robin customers list --sort-by name --sort-order asc --json

# Get a single contact
robin customers get <customerId> --json

# See what announcements a contact will receive
robin customers announcements <customerId> --json

# List tags
robin tags list --json
robin tags list --limit 50 --cursor <cursor> --json

# Get a single tag
robin tags get <tagId> --json
```

`--agent <agentId>` overrides the default Robin on any of the above.

---

### 2. Create individually

#### Create a contact

```bash
robin customers create \
  --name "Jane Smith" \
  --phone "+15551234567"
```

Optional flags:

| Flag | Description |
|------|-------------|
| `--opted-in` | Mark as opted in to announcements at creation time |
| `--notes <text>` | Internal notes about the contact |
| `--welcome-message <msg>` | Message Robin sends when this contact first texts in |
| `--agent <agentId>` | Override default Robin |

> **Opt-in is a compliance gate.** Only set `--opted-in` after asking the user to name the consent mechanism (e.g. ticket purchase opt-in, venue sign-up form). If they can't confirm, omit the flag — contacts default to opted out and can join by texting START.

#### Create a tag

```bash
robin tags create --name "VIP"
```

Optional flags:

| Flag | Description |
|------|-------------|
| `--description <text>` | What this tag is for |
| `--visibility <value>` | `PRIVATE` (default), `CONTEXTUAL`, or `PUBLIC` |
| `--additional-keywords <kw...>` | Extra SMS keywords contacts can text to join (PUBLIC tags only) |
| `--welcome-message <msg>` | Message sent when a contact subscribes via keyword |
| `--agent <agentId>` | Override default Robin |

> Always ask the user about `--visibility` before creating. `PUBLIC` exposes subscribe keywords to opt-in via SMS — confirm this is intentional before setting it.

---

### 3. Update and manage

#### Update a contact

```bash
robin customers update <customerId> \
  --name "Jane Smith" \
  --notes "Upgraded to VIP at the door" \
  --opted-in true
```

Supported fields: `--name`, `--notes`, `--opted-in true|false`

#### Update a tag

```bash
robin tags update <tagId> \
  --description "Premium ticket holders" \
  --visibility PRIVATE
```

Supported fields: `--description`, `--visibility`, `--additional-keywords`, `--welcome-message`

#### Assign a tag to a contact

```bash
robin tags assign <customerId> --tag <tagId>
```

#### Remove a tag from a contact

```bash
# tagCustomerId is the join-record ID returned by the assign response or contacts list
robin tags unassign <customerId> <tagCustomerId>
```

> When tagging or untagging more than ~10 contacts at once, prefer the bulk-import flow with `--tag-ids` instead of individual `tags assign` calls.

#### Delete a tag

```bash
robin tags delete <tagId>
```

> Never pass `--yes` to a tag delete without explicit user confirmation. Deleting a tag removes it from every contact assigned to it — this cannot be undone.

---

### 4. Bulk import

For importing more than a handful of contacts at once. See [`WORKFLOW.md`](./WORKFLOW.md) for the full procedure.

Quick reference:

```bash
robin customers bulk-import \
  --agent "$AGENT_ID" \
  --file contacts.json \
  --tag-ids tag_1 tag_2
```

The `--file` must be a JSON array. The CLI does not accept CSV directly:

```json
[
  { "name": "Jane Smith", "phone": "+15551234567", "optedIn": false },
  { "name": "Bob Jones", "phone": "+15559876543", "notes": "Vendor", "optedIn": false }
]
```

---

## Key rules

- **Always use the CLI. Never call the Robin REST API directly.** The CLI handles auth, pagination, and error handling. Raw `curl` or direct HTTP calls are not acceptable substitutes.
- Speak in **contacts**; the CLI surface uses `customers`.
- Phone numbers must be **E.164** (`+15551234567`). Validate before submitting — fix locally rather than letting the API reject the whole batch.
- Always resolve the Robin first — contacts and tags are agent-scoped. Use `robin config get default-agent` or pass `--agent` explicitly.
- Tag deletes are permanent and cascade. Never delete without explicit user confirmation.
- `PUBLIC` tag visibility exposes SMS keywords. Confirm intent before creating or updating to `PUBLIC`.
- Opt-in is a compliance gate, not a convenience flag. Before setting `optedIn: true` on any contact — individually or in bulk — ask the user to name the consent mechanism (ticket purchase form, venue sign-up, web opt-in, etc.). If they cannot confirm clearly, set `optedIn: false` and let contacts join via START. See `WORKFLOW.md` Phase 2, step 2 for the mandatory confirmation script.
- Batching is better. For more than ~10 individual tag assignments, use `bulk-import --tag-ids` instead of looping `tags assign`.
- This skill stops at "the audience exists and is correctly tagged." For sending messages to contacts, use [`robin-announcement-builder`](../robin-announcement-builder/SKILL.md).

---

## Sub-workflows

- Full bulk import procedure: [`WORKFLOW.md`](./WORKFLOW.md)
