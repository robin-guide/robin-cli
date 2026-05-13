# Robin Plugin

Scriptable access to the [Robin](https://robin.guide) platform from Claude Cowork and Claude Code. Configure agents, manage contacts, write and schedule announcements, review conversations, and run QA tests — all via the Robin CLI.

## Requirements

- Node 18+
- Robin CLI: `npm install -g @robinai/cli@latest`
- API key from [app.robin.guide](https://app.robin.guide) → Settings → API Keys

## Skills

| Skill | Trigger phrases |
|-------|----------------|
| **robin** | "list my Robins", "update this Robin's knowledge", "reply to a conversation", "manage tags", "manage websites" |
| **robin-builder** | "set up a Robin", "build a Robin from scratch", "configure my Robin's knowledge base", "update how my Robin talks" |
| **robin-announcement-builder** | "create an announcement", "send a broadcast", "write an event update", "schedule a message", "which tags should this go to?" |
| **robin-conversation-assessment** | "assess conversations", "how is the Robin performing?", "what questions is the Robin stumped on?", "QA the Robin", "create a test plan" |
| **robin-contacts-management** | "add a contact", "bulk import contacts", "tag all VIPs", "find a contact by phone", "clean up tags" |

## Install the Plugin

**In Cowork or Claude Code:**

```
/plugin marketplace add robin-guide/robin-cli
/plugin install robin@robin
/reload-plugins
```

## Setup (CLI)

```bash
# Install the CLI
npm install -g @robinai/cli@latest

# Authenticate
robin auth login --key robin_your_key --url https://api.robin.guide

# Set a default Robin (optional but recommended)
robin agents list --json
robin config set default-agent <agentId>
```

## References

- [Getting Started](skills/robin/references/getting-started.md)
- [Full Command Reference](skills/robin/references/command-reference.md)
