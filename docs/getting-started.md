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
robin auth login --key robin_your_api_key --url https://api.robinai.com
```

## Set Defaults

Avoid repeating `--agent` on every command:

```bash
robin config set default-agent <agentId>
robin config set default-team <teamId>
```

## Basic Usage

```bash
# List your agents
robin agents list

# List customers (uses default agent)
robin customers list

# Get a specific customer
robin customers get cust_123 --agent agent_456

# Send a reply to a conversation
robin conversations reply thread_789 --content "Hello! How can I help?"

# Pause AI for a thread
robin conversations pause thread_789
```

## AI Agent Usage

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
