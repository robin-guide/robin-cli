---
name: robin-conversation-assessment
description: |
  Analyze Robin agent conversations and produce a structured assessment report covering interaction quality, stumped questions, engagement patterns, named contacts, and knowledge gap recommendations. Also used for QA testing — designing test experiences, scoring replies, and iterating on config. Use when asked to assess Robin conversations, review conversation quality, test a Robin, or generate a Robin activity report.
allowed-tools:
  - Bash(robin:*)
  - Bash(curl:*)
  - Bash(python:*)
  - Bash(npx:*)
  - Bash(npm:*)
---

# Robin Conversation Assessment

Fetch and analyze Robin agent conversations using the Robin CLI. Classify each interaction, identify patterns, and compile a structured Markdown report.

The report is written to stdout (or a file if the user specifies one). How it gets shared — Slack, email, saved as a file, printed to terminal — is up to the caller.

## When to use

- "assess the Robin's conversations"
- "how has the Robin been performing?"
- "analyze what people are asking the Robin"
- "generate a Robin activity report"
- "what questions is the Robin stumped on?"
- "create a test plan for this Robin"
- "QA the Robin after this config change"
- "test that the Robin handles [scenario] correctly"

## Prerequisites

**Robin CLI must be installed and authenticated.**

```bash
# Install if missing
npm install -g @robinai/cli

# Check auth
robin auth status
```

If not authenticated, run `robin auth login` and follow the prompts.

If no default agent is configured:

```bash
robin agents list --json
robin config set default-agent <agentId>
```

## What this skill does

**Assessment mode** (real conversations):

1. Fetches all threads for the target agent (paginated via `robin agents threads`)
2. Retrieves full message history per thread (`robin conversations get`)
3. Classifies each conversation using a standard taxonomy
4. Compiles a structured Markdown assessment report

**QA testing mode** (proactive testing):

1. Pulls the current Robin configuration before writing tests
2. Designs a small smoke or rubric test suite with exact prompts and expected behavior
3. Runs tests sequentially with fresh web-channel context
4. Scores replies for correctness, compliance, tone, completeness, and cleanliness
5. Identifies which config layer to fix when something fails

See `WORKFLOW.md` for the full step-by-step process.

## Output

A Markdown document with these sections:

1. Executive summary
2. Handled well (with examples)
3. Stumped / unanswered questions
4. Quality issues
5. Announcement engagement
6. Geographic reach
7. Named contacts (CRM opportunities)
8. Top question categories
9. Recommendations

By default, print the report to stdout. If the user asks to save it, write it to a file they specify (e.g. `assessment-2025-05-04.md`).

## Key rules

- **Qualitative, not fabricated.** Only report numbers you can directly verify from the data. Use descriptive language ("several", "most", "a handful") rather than guessing totals.
- **Paginate fully.** Keep fetching until `hasMore` is false, or until the agreed scope is reached.
- **No delivery assumptions.** Do not post to Slack, send email, or share anywhere. Return the report and let the caller decide.
- **Don't narrate the process.** Fetch, analyze, then deliver the report. Skip the play-by-play.
- **Small tests beat broad tests.** For QA, use 5-8 focused questions before expanding scope.
- **Fresh context for tests.** Reset the web-channel conversation before each standalone test question, and never run web-channel tests in parallel.
- **Watch for leaked internals.** Flag hallucinated tool names, internal labels, database names, or process narration as quality failures.
