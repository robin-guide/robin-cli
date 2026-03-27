# Robin CLI 🪶

Scriptable command-line access to the [Robin](https://robin.guide) platform. Built for humans and AI agents alike.

## Install

```bash
npm install -g @robinai/cli
```

## Quick Start

```bash
# Authenticate
robin auth login

# Set defaults (optional, reduces repetition)
robin config set default-agent <agentId>

# List agents
robin agents list

# Send a message
robin conversations reply <threadId> --content "Hello!"

# AI-agent friendly JSON output
robin agents list --json
```

## Why

Robin users — and the AI agents they build on top of Robin — need a fast, scriptable way to interact with the Robin API without hand-rolling HTTP calls. The CLI maps 1:1 to the API surface, with:

- `--json` flag for clean structured output (pipes, jq, AI agents)
- Human-readable formatted output by default (tables, colors, spinners)
- Global flags for CI and multi-environment use (`--api-key`, `--base-url`)
- Persistent defaults so you don't repeat `--agent` on every command

## Commands

| Group | Commands |
|-------|----------|
| `auth` | `login`, `logout`, `status` |
| `config` | `set`, `get`, `list` |
| `agents` | `list`, `get`, `create`, `update`, `threads`, `metadata`, `configs` |
| `customers` | `list`, `get`, `create`, `update`, `bulk-import`, `announcements` |
| `conversations` | `get`, `reply`, `pause`, `resume` |
| `announcements` | `list`, `create`, `update`, `delete`, `tag-counts`, `schedule-message` |
| `tags` | `list`, `get`, `create`, `update`, `delete`, `assign`, `unassign` |
| `websites` | `list`, `add`, `update`, `remove`, `configure` |
| `invitations` | `list`, `create`, `revoke` |

## Docs

- [Getting Started](./docs/getting-started.md)
- [Full Command Reference](./docs/reference.md) — AI-optimized, every flag documented

## Tech

- TypeScript + [Commander.js](https://github.com/tj/commander.js) + [Ink](https://github.com/vadimdemedes/ink)
- Node 18+ (uses built-in `fetch`)
- Config stored at `~/.robin/config.json`

## License

MIT
