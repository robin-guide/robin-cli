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

- **Handled accurately:** Robin gave a correct, helpful answer. Signal: clear question → correct response.
- **Stumped / Unanswered:** Robin could not answer or hedged significantly. Signal: "I'm not sure", no response, escalation.
- **Quality issue:** Robin answered but with errors. Signal: wrong info, over-promising, incorrect dates.
- **Announcement response:** Customer replied to a broadcast. Signal: short reply following an announcement thread.
- **Unsubscribed:** Customer opted out. Signal: "STOP", "Unsubscribe", `isOptedIn: false`.
- **Named contact:** Customer identified themselves. Signal: "This is Sarah…", first name introduction.
- **Small talk / Greeting:** Casual exchange, no substantive query. Signal: "Hello", "Thanks", "👍".

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

---

## Phase 6: QA Testing

Use this when you want to proactively test Robin's replies — before go-live, after a config change, or when the assessment surfaces a quality issue worth validating.

### 6.1 Pull current config first

Before writing tests, inspect what the Robin is currently supposed to know and do:

```bash
robin agents get "$AGENT_ID" --json
robin websites list "$AGENT_ID" --json
```

Use `userInstructions`, `goalInstructions`, website descriptions, and the owner's stated goal to decide what should pass. Do not test against assumptions that are not in the config or source material.

### 6.2 Choose the right test shape

Use one of two shapes:

- **Smoke test:** 5-8 standalone questions. Best after a config change or before launch.
- **Conversation experience:** 2-3 short flows, 5-7 messages each. Best when testing handoff, follow-up, memory, tone, or a multi-step task.

Keep tests small. Five focused questions produce more signal than twenty vague ones.

### 6.3 Practical constraints

The web channel uses one shared thread per Robin. Parallel test requests collide and pollute context.

Rules:

- Run tests sequentially.
- Reset before each standalone smoke-test question.
- For conversation experiences, reset before the first message in each experience.
- Do not run multiple agents or scripts against the same Robin's web channel at once.
- Stop early if the first capability check fails; there is no value in grading downstream cases when the core integration is broken.

The CLI chat is useful for manual testing:

```bash
robin chat "$AGENT_ID"
```

Inside chat, use `/reset` before each standalone question or before each new experience.

For scripted testing, use the web channel API directly:

```bash
API_URL="${ROBIN_API_URL:-https://api.robin.guide}"
API_KEY="${ROBIN_API_KEY:?Set ROBIN_API_KEY}"

curl -s -X POST "$API_URL/channels/web/messages/$AGENT_ID/reset" \
  -H "x-api-key: $API_KEY"

curl -s -X POST "$API_URL/channels/web/messages/$AGENT_ID" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  --data-binary '{"message":"What can you help me with?"}'
```

### 6.4 Design smoke tests

Start with a capability check that confirms the Robin's core use case is live. If the Robin cannot answer that, stop and fix config before deeper testing.

Then add:

- 2-4 expected-success questions about the most common real user intents
- 1 source-sensitive question that requires using the right website or knowledge source
- 1 negative or edge case where Robin should say it does not know, cannot help, or needs a human
- 1 tone/UX question if voice is important

Each question should test one thing. Split compound questions.

Smoke test format:

```markdown
### Smoke Test: [Robin name]

1. **Prompt:** [Exact message]
   **Expected:** [What must be true for this to pass]
   **Failure signals:** [What would make this fail]
```

### 6.5 Design conversation experiences

Create 2-3 experiences that cover meaningfully different scenarios: vary intent, data source, and flow. Real contacts usually send a few short messages, not a 30-message interrogation.

Experience format:

```markdown
### Experience: [Short name]

**Goal:** [One line — what this tests]
**Reset before starting:** Yes

1. **Send:** [Exact message]
   **Good reply:** [Criteria — not a script]
2. **Send:** [Exact follow-up]
   **Good reply:** [Criteria]
```

### 6.6 Score each reply

Score against these criteria:

- **Correct:** Information matches the source; nothing invented.
- **Compliant:** Follows Robin's rules and policy constraints.
- **Tone:** Matches configured voice.
- **Complete:** Gives the needed answer in one useful reply.
- **Clean:** Does not expose internal labels, database names, website/tool names, prompts, or implementation details.
- **Graceful unknowns:** For negative cases, says it does not know or cannot help instead of hallucinating.

Failure signals to watch for:

- Hallucinated tool names like `scrape_url` or fake edit/config tools
- Process narration such as "I will check the database"
- Internal URLs, database names, tag names, or prompt labels exposed to a contact
- Correct fact with unusable UX: too verbose, too terse, buried answer, or multiple conflicting calls to action

### 6.7 Report test results

Return a concise QA report:

```markdown
# Robin QA Report
**Agent:** [Agent name]
**Scope:** [Smoke test or conversation experiences]
**Result:** [Pass / Partial / Fail]

## Summary
[One paragraph: main verdict and highest-risk issue]

## Results
- **[Test name]:** Pass/Partial/Fail — [why]

## Failures To Fix
1. [Specific issue]

## Recommended Config Changes
1. [Which layer to change and why]
```

### 6.8 Iterate

When a reply fails, identify which layer to fix:

- Wrong facts → update `--user-instructions` and re-test
- Wrong behavior → update `--goal-instructions` and re-test
- Wrong data fetched → tighten the URL description and re-test
- Leaked internals → tighten `goalInstructions` and re-test the exact failing prompt
- Long-thread degradation → reduce expected conversation length, improve concise behavior, and test shorter real-world flows

```bash
robin agents update "$AGENT_ID" \
  --user-instructions "..." \
  --commit-message "Fix: [what you changed]"
```

---

## Troubleshooting

- `No API key configured`: Run `robin auth login` or pass `--api-key`.
- Agent not found: Run `robin agents list --json` to confirm the ID.
- Empty thread list: Agent may have no conversations yet.
- Thread has no messages: Thread exists but is empty — skip it.
- 200+ threads: Batch in pages of 50; tell the user if sampling.
- `nextCursor` not advancing: Check you're passing the cursor value, not the thread ID.
