# Robin CLI — Full Command Reference

> This document is optimized for AI agent consumption. Every command is listed with its flags, required API permissions, the underlying API route, and example usage.

## Global Flags

These flags apply to every command:

| Flag | Description |
|------|-------------|
| `--json` | Emit raw JSON to stdout. No colors, no tables. Use this in scripts and AI agents. |
| `--api-key <key>` | Override the stored API key (useful in CI). |
| `--base-url <url>` | Override the stored base URL. |
| `--agent <id>` | Override the default agent ID. |
| `--team <id>` | Override the default team ID. |
| `--verbose` | Show full request URL, masked headers, and raw response body. |

---

## auth

Local credential management. No API calls except `auth status`.

### `robin auth login`

Store API key and base URL.

```bash
# Interactive
robin auth login

# Non-interactive
robin auth login --key robin_xxx --url https://api.robin.guide
```

**Flags:** `--key <key>`, `--url <url>`

### `robin auth logout`

Clear stored credentials from `~/.robin/config.json`.

```bash
robin auth logout
```

### `robin auth status`

Show current auth config (key is masked) and check API reachability via `GET /status`.

```bash
robin auth status
```

Example output:
```
API Key:       robin_xxx...
Base URL:      https://api.robin.guide
Default Agent: agent_abc123
Default Team:  (none)
API Status:    ✓ reachable (200)
```

---

## config

Manage default values stored in `~/.robin/config.json`.

### `robin config set <key> <value>`

Valid keys: `default-agent`, `default-team`, `base-url`.

```bash
robin config set default-agent agent_abc123
robin config set default-team team_xyz789
```

### `robin config get <key>`

```bash
robin config get default-agent
```

### `robin config list`

```bash
robin config list
```

---

## agents

**Required permission:** `agents.read` (list/get) · `agents.write` (create/update)

### `robin agents list`

**API:** `GET /agents`

```bash
robin agents list
robin agents list --json
```

### `robin agents get <agentId>`

**API:** `GET /agents/:agentId`

```bash
robin agents get agent_abc123
robin agents get agent_abc123 --json
```

### `robin agents create`

**API:** `POST /agents`

```bash
robin agents create --name "Support Bot" --team team_xyz
robin agents create --name "Support Bot" --team team_xyz \
  --goal-instructions "Always respond in a friendly tone." \
  --user-instructions "Users are small business owners managing SMS conversations."
```

**Flags:** `--name <name>` (required), `--team <teamId>`, `--goal-instructions <text>`, `--user-instructions <text>`, `--model <model>`, `--time-zone <tz>`

- `--goal-instructions` — Tells the agent HOW to act (personality, tone, rules)
- `--user-instructions` — Provides the agent with background knowledge about users/context

### `robin agents update <agentId>`

**API:** `POST /agents/:agentId`

```bash
robin agents update agent_abc123 --name "New Name"
robin agents update agent_abc123 \
  --goal-instructions "Be concise and helpful." \
  --user-instructions "Users are enterprise customers." \
  --commit-message "Tighten instructions"
```

**Flags:** `--name <name>`, `--goal-instructions <text>`, `--user-instructions <text>`, `--model <model>`, `--time-zone <tz>`, `--commit-message <msg>`

- `--goal-instructions` — Tells the agent HOW to act (personality, tone, rules)
- `--user-instructions` — Provides the agent with background knowledge about users/context
- `--commit-message` — Describes what changed (stored in configuration history)

### `robin agents threads <agentId>`

**API:** `GET /agents/:agentId/threads`

```bash
robin agents threads agent_abc123
robin agents threads agent_abc123 --cursor next_page_token --page-size 25
```

**Flags:** `--cursor <cursor>`, `--page-size <size>`

### `robin agents metadata <agentId>`

**API:** `GET /agents/:agentId/metadata/customers`

```bash
robin agents metadata agent_abc123 --json
```

### `robin agents configs <agentId>`

**API:** `GET /agents/:agentId/configurations`

```bash
robin agents configs agent_abc123 --json
```

---

## customers

**Required permission:** `customers.read` (list/get) · `customers.write` (create/update/bulk-import)

### `robin customers list`

**API:** `GET /customers`

```bash
robin customers list --agent agent_abc123
robin customers list --name "Alice" --phone "+1555"
robin customers list --tag-id tag_1 --tag-id tag_2
robin customers list --json | jq '.[].id'
```

**Flags:** `--agent <id>`, `--cursor`, `--page-size`, `--sort-by`, `--sort-order`, `--tag-id <id...>`, `--name`, `--phone`

### `robin customers get <customerId>`

**API:** `GET /customers/:customerId`

```bash
robin customers get cust_123 --agent agent_abc123
```

**Flags:** `--agent <id>`

### `robin customers create`

**API:** `POST /customers`

```bash
robin customers create --agent agent_abc123 --phone "+15551234567" --name "Alice Smith" --opted-in
```

**Flags:** `--agent <id>`, `--phone <phone>` (required), `--name <name>` (required), `--opted-in`, `--notes <notes>`, `--welcome-message <msg>`

### `robin customers update <customerId>`

**API:** `PATCH /customers/:customerId`

```bash
robin customers update cust_123 --agent agent_abc123 --name "Alice Jones"
```

**Flags:** `--agent <id>`, `--name`, `--notes`, `--opted-in <true|false>`

### `robin customers bulk-import`

**API:** `POST /customers/bulk`

The JSON file should be an array of customer objects.

```bash
robin customers bulk-import --agent agent_abc123 --file contacts.json --tag-ids tag_1 tag_2
```

**Flags:** `--agent <id>`, `--file <path>` (required), `--tag-ids <ids...>`

### `robin customers announcements <customerId>`

**API:** `GET /customers/:customerId/announcements`

```bash
robin customers announcements cust_123 --agent agent_abc123
```

**Flags:** `--agent <id>`

---

## conversations

**Required permission:** `conversations.read` (get) · `threads.write` (reply/pause/resume)

### `robin conversations get <threadId>`

**API:** `GET /threads/:threadId`

```bash
robin conversations get thread_abc123
robin conversations get thread_abc123 --json
```

### `robin conversations reply <threadId>`

**API:** `POST /threads/:threadId/messages`

```bash
robin conversations reply thread_abc123 --content "Thanks for reaching out!"
```

**Flags:** `--content <content>` (required), `--media-asset-id <id>`

### `robin conversations pause <threadId>`

**API:** `PATCH /threads/:threadId` → `{agentPaused: true}`

```bash
robin conversations pause thread_abc123
```

### `robin conversations resume <threadId>`

**API:** `PATCH /threads/:threadId` → `{agentPaused: false}`

```bash
robin conversations resume thread_abc123
```

---

## announcements

**Required permission:** `announcements.read` · `announcements.write`

### `robin announcements list <agentId>`

**API:** `GET /announcements/:agentId`

```bash
robin announcements list agent_abc123 --json
```

### `robin announcements create <agentId>`

**API:** `POST /announcements/:agentId`

```bash
robin announcements create agent_abc123 \
  --title "Summer Sale" \
  --content "Big discounts this week!" \
  --send-at "2024-07-01T09:00:00Z" \
  --tag-ids tag_1 tag_2
```

**Flags:** `--title` (required), `--content` (required), `--send-at <ISO>` (required), `--tag-ids <ids...>`, `--phone-numbers <phones...>`, `--media-asset-id <id>`

### `robin announcements update <announcementId>`

**API:** `PATCH /announcements/:announcementId`

```bash
robin announcements update ann_123 --send-at "2024-07-02T09:00:00Z"
```

**Flags:** `--title`, `--content`, `--send-at`, `--tag-ids <ids...>`

### `robin announcements delete <announcementId>`

**API:** `DELETE /announcements/:announcementId`

```bash
robin announcements delete ann_123
```

### `robin announcements tag-counts <agentId>`

**API:** `GET /announcements/:agentId/tag-counts`

```bash
robin announcements tag-counts agent_abc123 --tag-ids tag_1 tag_2 --json
```

**Flags:** `--tag-ids <ids...>`

### `robin announcements schedule-message <agentId>`

**API:** `POST /announcements/:agentId/singleton/`

```bash
robin announcements schedule-message agent_abc123 \
  --customer cust_123 \
  --content "Your appointment is tomorrow." \
  --send-at "2024-06-30T08:00:00Z"
```

**Flags:** `--customer <customerId>` (required), `--content <content>` (required), `--send-at <ISO>` (required), `--media-asset-id <id>`

---

## tags

**Required permission:** `tags.read` · `tags.write`

### `robin tags list`

**API:** `GET /tags`

```bash
robin tags list --agent agent_abc123
robin tags list --agent agent_abc123 --limit 50 --json
```

**Flags:** `--agent <id>`, `--cursor`, `--limit`

### `robin tags get <tagId>`

**API:** `GET /tags/:tagId`

```bash
robin tags get tag_abc123 --json
```

### `robin tags create`

**API:** `POST /tags`

```bash
robin tags create --agent agent_abc123 --name "VIP" --description "VIP customers" --visibility public
```

**Flags:** `--agent <id>`, `--name <name>` (required), `--description`, `--visibility`, `--keywords <kw...>`, `--welcome-message`

### `robin tags update <tagId>`

**API:** `PATCH /tags/:tagId`

```bash
robin tags update tag_abc123 --description "Updated description"
```

**Flags:** `--description`, `--visibility`, `--keywords <kw...>`, `--welcome-message`

### `robin tags delete <tagId>`

**API:** `DELETE /tags/:tagId`

```bash
robin tags delete tag_abc123
```

### `robin tags assign <customerId>`

**API:** `POST /customers/:customerId/tags`

```bash
robin tags assign cust_123 --tag tag_abc123
```

**Flags:** `--tag <tagId>` (required)

### `robin tags unassign <customerId> <tagCustomerId>`

**API:** `DELETE /customers/:customerId/tags/:tagCustomerId`

```bash
robin tags unassign cust_123 tagcust_456
```

---

## websites

**Required permission:** `websites.read` · `websites.write`

### `robin websites list <agentId>`

**API:** `GET /agents/:agentId/tools/web-crawler/websites`

```bash
robin websites list agent_abc123 --json
```

**Flags:** `--cursor`, `--limit`

### `robin websites add <agentId>`

**API:** `POST /agents/:agentId/tools/web-crawler/websites`

```bash
robin websites add agent_abc123 --url "https://docs.example.com" --description "Product docs"
```

**Flags:** `--url <url>` (required), `--description <desc>` (required)

### `robin websites update <agentId> <websiteId>`

**API:** `PATCH /agents/:agentId/tools/web-crawler/websites/:websiteId`

```bash
robin websites update agent_abc123 site_456 --description "Updated docs"
```

**Flags:** `--url`, `--description`

### `robin websites remove <agentId> <websiteId>`

**API:** `DELETE /agents/:agentId/tools/web-crawler/websites/:websiteId`

```bash
robin websites remove agent_abc123 site_456
```

### `robin websites configure <agentId>`

**API:** `POST /agents/:agentId/tools/web-crawler`

```bash
robin websites configure agent_abc123 --enable
robin websites configure agent_abc123 --disable
robin websites configure agent_abc123 --enable --system-instructions "Only use content from the docs site."
```

**Flags:** `--enable` / `--disable`, `--system-instructions <instructions>`

---

## invitations

**Required permission:** `admin`

### `robin invitations list`

**API:** `GET /invitations`

```bash
robin invitations list --json
```

### `robin invitations create`

**API:** `POST /invitations`

```bash
robin invitations create --team team_xyz --phone "+15551234567" --name "Jane Doe"
```

**Flags:** `--team <teamId>`, `--phone <phone>` (required), `--name <name>` (required)

### `robin invitations revoke <invitationId>`

**API:** `POST /invitations/revoke/:invitationId`

```bash
robin invitations revoke inv_abc123
```
