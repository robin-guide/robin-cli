# Robin Conversation Assessment — Workflow

Systematic process for fetching Robin agent conversations, classifying each one, and compiling a Markdown assessment report.

---

## Phase 1: Setup

### 1.1 Verify auth and resolve agent

```bash
robin auth status

# Use configured default, or list and ask
AGENT_ID=$(robin config get default-agent 2>/dev/null)
if [ -z "$AGENT_ID" ]; then
  robin agents list --json
fi

# Confirm agent name before proceeding
robin agents get "$AGENT_ID" --json
```

Tell the user which agent you're assessing.

### 1.2 Determine scope

Default: most recent 50 threads. Ask the user if they want more or a specific range.

```bash
PAGE_SIZE=50
```

---

## Phase 2: Fetch conversations

### 2.1 Paginate through threads

```bash
# First page
robin agents threads "$AGENT_ID" --page-size "$PAGE_SIZE" --json

# Subsequent pages — pass nextCursor from previous response
robin agents threads "$AGENT_ID" --page-size "$PAGE_SIZE" --cursor "$NEXT_CURSOR" --json
```

Repeat until `hasMore` is `false` or the agreed scope is satisfied.

Each thread in the response:
```json
{
  "id": "thread-id",
  "lastMessage": { "role": "customer|agent", "content": "...", "createdAt": "..." },
  "customer": { "id": "...", "name": "Name or null", "phoneNumber": "+1...", "isOptedIn": true },
  "status": "...",
  "isRead": true
}
```

### 2.2 Fetch full conversations

For each thread, retrieve the complete message history:

```bash
robin conversations get "$THREAD_ID" --json
```

Response:
```json
{
  "thread": {
    "id": "...",
    "customer": { "id": "...", "name": "...", "phoneNumber": "..." },
    "messages": [
      { "id": "...", "content": "...", "role": "customer|agent", "status": "...", "createdAt": "..." }
    ],
    "agentPaused": false
  }
}
```

> **Efficiency tip:** The thread list already includes `lastMessage` and `customer.isOptedIn`. For threads you can classify from that alone (e.g. clear unsubscribes, one-word greetings), you may skip the full fetch. Only call `conversations get` when you need full message context.

---

## Phase 3: Classify each conversation

### Categories

| Category | Definition | Signal |
|----------|-----------|--------|
| **Handled accurately** | Robin gave a correct, helpful answer | Clear question → correct response |
| **Stumped / Unanswered** | Robin couldn't answer or hedged significantly | "I'm not sure", no response, escalation |
| **Quality issue** | Robin answered but with errors | Wrong info, over-promising, incorrect dates |
| **Announcement response** | Customer replied to a broadcast | Short reply following an announcement thread |
| **Unsubscribed** | Customer opted out | "STOP", "Unsubscribe", `isOptedIn: false` |
| **Named contact** | Customer identified themselves | "This is Sarah…", first name introduction |
| **Small talk / Greeting** | Casual exchange, no substantive query | "Hello", "Thanks", "👍" |

### Data to record per thread

- **Contact**: `customer.name` or last 4 digits of phone if unnamed
- **Category**: from the table above
- **Topic**: what they asked (1–3 words)
- **Robin's response quality**: Accurate / Partial / Incorrect / No response
- **Notable details**: anything CRM-worthy, surprising, or actionable
- **Location signals**: area codes, city mentions, event names

---

## Phase 4: Compile the report

Produce a Markdown document with the following sections.

### Report structure

```markdown
# Robin Conversation Assessment
**Agent:** [Agent name]
**Period:** [earliest createdAt] – [latest createdAt]
**Conversations reviewed:** [N]

---

## Executive Summary
[One paragraph: overall quality verdict, main themes, standout finding]

---

## Handled Well
[Count] conversations ([%] of total)

[3–5 concrete examples with brief description]

**Common successful topics:** [list]

---

## Stumped / Unanswered
[Count] conversations

**Questions Robin couldn't answer:**
- [Question or paraphrase] — [brief context]
- …

**Pattern:** [What topics cause problems? What knowledge gaps should be filled?]

---

## Quality Issues
[Count found — or "None identified"]

[Specific errors, what went wrong, whether the customer was misled]

---

## Announcement Engagement
[Which announcements got replies? What follow-up questions did they spark?]
Unsubscribes: [N]

---

## Geographic Reach
[Location signals from area codes, city mentions, or event references]

---

## Named Contacts
[Customers who identified themselves — potential CRM entries or VIPs]

---

## Top Question Categories
1. [Topic] — [N conversations]
2. …

---

## Recommendations
1. [Actionable finding — specific, not generic]
2. …
```

### Tone

- Qualitative first. "Dozens", "most", "a handful" — not invented numbers.
- Honest about issues. Don't soften errors.
- Actionable. Every section ends with a "so what."

---

## Phase 5: Deliver the report

Print the Markdown report to stdout.

If the user asked to save it to a file:

```bash
# Write to file
cat > "robin-assessment-$(date +%Y-%m-%d).md" << 'EOF'
[report content]
EOF
```

That's it. No posting, no delivery. The caller decides what happens next.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `No API key configured` | Run `robin auth login` or pass `--api-key` |
| Agent not found | Run `robin agents list --json` to confirm the ID |
| Empty thread list | Agent may have no conversations yet |
| Thread has no messages | Thread exists but is empty — skip it |
| 200+ threads | Batch in pages of 50; tell the user if sampling |
| `nextCursor` not advancing | Check you're passing the cursor value, not the thread ID |
