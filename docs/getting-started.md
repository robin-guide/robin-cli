# Getting Started with Robin CLI

## Install

```bash
npm install -g @robinai/cli
```

## Login

```bash
# Interactive
robin auth login

# Non-interactive (for CI/scripts)
robin auth login --key robin_your_api_key --url https://api.robin.guide
```

## Set Defaults

Avoid repeating `--agent` on every command:

```bash
robin config set default-agent <agentId>
robin config set default-team <teamId>
```

## Basic Usage

```bash
# List your Robins
robin agents list

# Find customers — filter by name, phone, or tag
robin customers list --agent agent_456
robin customers list --name "Alice" --agent agent_456
robin customers list --phone "+1555" --agent agent_456

# Get a specific customer record
robin customers get cust_123 --agent agent_456

# Send a reply to a conversation
robin conversations reply thread_789 --content "Hello! How can I help?"

# Pause AI for a thread so a human can step in
robin conversations pause thread_789

# Resume AI when the human is done
robin conversations resume thread_789
```

## Interactive Customer Intelligence

Launch the interactive shell for a keyboard-driven way to find a customer and review their context:

```bash
robin ui
```

Select **Customers** from the menu, pick a Robin, then choose a customer to open their dossier.
The dossier shows:

- **Identity** — phone, external ID, opt-in status, tags
- **Context** — notes, welcome message
- **Timeline** — created / updated timestamps
- **Details** — any additional fields returned by the API

From the dossier, press `c` to jump straight to that Robin's conversations, or `q` to go back.

## Automation Usage

Pass `--json` for clean, parseable output:

```bash
# Get structured JSON output
robin agents list --json

# Pipe into jq
robin customers list --json | jq '.[] | {id, name, phone}'

# Use in CI with API key override
robin agents list --json --api-key $ROBIN_API_KEY
```

## Help

Every command has built-in help:

```bash
robin --help
robin agents --help
robin agents list --help
```

## Auth Status

```bash
robin auth status
```

## Next Steps

See [reference.md](./reference.md) for the full command reference.
