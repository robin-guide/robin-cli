# Robin Builder — Workflow

Build or tune a Robin agent: discover the use case, configure via CLI, flag dashboard steps.

---

## Phase 0: Team selection (required before creating a new Robin)

Every Robin must belong to a team. **Never run `robin agents create` without `--team`.**

Start by listing the available teams so the user can pick one:

```bash
robin teams list
```

Show the output to the user and ask which team this Robin should belong to. If only one team is returned, confirm it before proceeding. Do not guess or default silently.

Once confirmed, store it as `$TEAM_ID` for use in the create command:

```bash
robin agents create \
  --name "<Robin name>" \
  --team "$TEAM_ID"
```

If the user already has an existing Robin and is only updating configuration (not creating), skip this phase.

---

## Phase 1: Discovery

Run a short conversational discovery before writing any config. One question at a time — don't front-load a list.

Typical arc:

1. **What's this Robin for?** — Event, venue, service, team? General use case.
2. **Who are the contacts?** — Ticket holders, fans, customers, attendees? What do they typically ask about?
3. **What should Robin know?** — Do you have URLs (schedule, FAQ, vendor list)? A knowledge base to paste in?
4. **What integrations are connected?** — Notion, Google Calendar, Mailchimp, ShowPass? (Sets which dashboard steps to flag.)
5. **What's the tone?** — Casual and brief, or formal and thorough? Match the brand.
6. **Anything Robin should never do?** — Reveal codes, paste internal URLs, answer about competitors, etc.

Keep it conversational. If the owner says "festival food vendor concierge," you probably have enough to start — react to what they give you, not a fixed list of questions.

---

## Phase 2: Pre-Flight Checklist

**Run this before writing any config. Every build.**

These are real issues that cause Robin to answer incorrectly or miss questions entirely.

### 1. Timezone first

Set timezone *before* anything else. Wrong timezone = wrong times on every schedule question.

Use IANA names: `America/Edmonton`, `America/Winnipeg`, `America/Vancouver`, `America/Halifax`, `America/Toronto`, `America/New_York`, `America/Los_Angeles`, etc.

```bash
robin agents update "$AGENT_ID" \
  --time-zone "America/Edmonton" \
  --commit-message "Set timezone"
```

### 2. URL descriptions must be query-shaped

Vague descriptions cause Robin to fetch the wrong page. Each URL description must answer: *"Use this when someone asks about X."*

❌ `"Event schedule page"`
✅ `"Use this page when a contact asks about the event schedule, set times, or stage lineup. Contains: artist names, set times, stage assignments. Do not use for parking or venue policies."`

Every description needs: trigger phrases, what data is on the page, what not to use it for. See Phase 3.3 for the full description format.

### 3. Keep URLs focused — quality over quantity

Robin has a limited number of tool calls per reply. With too many URLs, it burns calls on context retrieval and often never reaches the right page.

Aim for 10–12 URLs maximum. If two URLs cover the same topic, use the better one. Prefer pages that return clean HTML; JavaScript-rendered pages (SPAs, accordions) often return nothing to the scraper.

### 4. JS-rendered content is invisible to the scraper

Modern venue FAQ pages (accordion UIs, single-page apps) often return no useful text when scraped. For critical facts on these pages — bag policy, accessibility, parking, door times, food rules — extract them manually and embed them directly in the relevant URL's description field or in `userInstructions`.

### 5. Force Robin to fetch before answering

When websites are enabled, include this in `userInstructions` or website instructions:

> "Always call the website tool first before answering any question about schedules, pricing, hours, policies, or availability. Do not answer from memory."

Without this, Robin may answer from its training data instead of fetching live content.

### 6. Embed critical facts in URL descriptions

If a fact is critical and may not reliably surface from the scraped page, hardcode it directly in that URL's description:

```
"Minimum age: 19+. Doors: 6pm. Use this page when someone asks about
venue policies, entry requirements, or door times."
```

### 7. Personality defaults for events and venues

For events, live venues, and sports — don't leave personality at the default. Casual + Concise is almost always right for "what time does the show start?" conversations. Formal/verbose is wrong here.

Set in the Robin dashboard → Robin settings → Personality sliders.
Suggested starting point: **Casual 60–70%, Concise 60–70%.**

---

## Phase 3: Configure via CLI

### Knowledge architecture

Robin has three layers of knowledge. Use the right layer for the right content:

| Layer | Field / Mechanism | Best for |
|-------|-------------------|----------|
| Grounding facts | `userInstructions` | Static facts, product info, policies, integration usage rules |
| Behavioral identity | `goalInstructions` | Goals, tone, persona, rules of engagement |
| Live web content | Website sources | Schedules, prices, hours, FAQs — anything that changes |

### 3.1 Knowledge base (`userInstructions`)

```bash
robin agents update "$AGENT_ID" \
  --user-instructions "$(cat <<'EOF'
[Knowledge content here — paste-ready, no internal labels]
EOF
)" \
  --commit-message "Set knowledge base"
```

**What belongs here:**
- Hard facts the Robin should always know (hours, address, key policies)
- Content from JS-rendered pages the scraper can't reach
- Instructions for using connected integrations (e.g. "When the contact checks in, query the Vendors database and read the Perks, Description, and Badge fields for that row")

**What doesn't belong here:**
- Live-changing data → use website sources instead
- Persona and tone → use `goalInstructions`

### 3.2 Goals and persona (`goalInstructions`)

```bash
robin agents update "$AGENT_ID" \
  --goal-instructions "$(cat <<'EOF'
[Persona content here]
EOF
)" \
  --commit-message "Set persona and goals"
```

**What belongs here:**
- Robin's role (e.g. "You are a friendly guide for festival attendees")
- Tone and voice (e.g. "Concise, warm, no corporate filler")
- Behavioral rules (e.g. "Never reveal promo codes unless the contact has checked in at that vendor")
- One-reply rule (e.g. "Do the work, then send one complete reply — no process narration")
- What never to do

**Pattern:**
```
You are [role] for [event/venue]. Your job is to [core purpose].

Be [tone]. When [situation], [do X]. Never [Y]. If you don't know, say so honestly.
```

### 3.3 Website knowledge sources

```bash
# Enable the web crawler
robin websites configure "$AGENT_ID" --enabled true

# Add a URL
robin websites add "$AGENT_ID" \
  --url "https://example.com/schedule" \
  --description "..."

# Review current websites
robin websites list "$AGENT_ID" --json

# Remove a URL
robin websites remove "$AGENT_ID" "$WEBSITE_ID" --yes
```

#### Writing a good description

The `--description` field is required. A good description tells Robin what the site is and what to use it for.

**Standard format:**
```
<One or two sentences about the site and what Robin should use it for.>

Resource types: <comma-separated list of content types on the page>
```

**Example:**
```
Use this page when a contact asks about the event schedule, set times,
or stage lineup. Contains artist names, set times, and stage assignments.
Do not use for parking or venue policies.

Resource types: set times, stage lineup, artist schedule
```

**Before writing the description, fetch the page** to see what's actually there. Don't guess. Focus on what Robin will practically use — what questions it can answer, what live data it can look up.

#### Parametric URL trick

When a page supports query parameters, document the full parameter schema so Robin can construct targeted URLs on the fly:

```
Event calendar with filter support.
- ?category=music filters by category
- ?date=2025-06-01 filters by date (YYYY-MM-DD)
- Combine: ?category=music&date=2025-06-01

Resource types: event listings, dates, categories, venue names
```

When the owner provides a URL with filters available, enumerate all valid parameter values before writing the description.

### 3.4 Dashboard-only components

Flag these as manual steps for the owner. Open [app.robin.guide](https://app.robin.guide) → select the Robin → Settings:

| Step | Where |
|------|-------|
| Set personality sliders (Casual/Concise) | Robin settings → Personality |
| Enable announcement opt-in (START keyword) | Robin settings → Announcements |
| Enable "Tell me if stumped" notifications | Robin settings → Notifications |
| Set keyword / mention alerts | Robin settings → Mentions |
| Connect Mailchimp | Integrations → Mailchimp |
| Connect Google Calendar | Integrations → Google Calendar |
| Connect Notion | Integrations → Notion |
| Connect ShowPass | Integrations → ShowPass |

For integrations: once connected, describe how Robin uses them inside `--user-instructions` (when to query, which fields to read, what to do with the data).

---

## Phase 4: Build output checklist

Before handing off, verify:

- [ ] Robin was created with `--team` (not without it)
- [ ] Timezone set
- [ ] All URL descriptions follow the standard format (trigger + Resource types + not-for)
- [ ] `userInstructions` and `goalInstructions` are set and don't overlap
- [ ] `scrape_url` force directive included if websites are enabled
- [ ] Dashboard steps listed clearly for the owner

To validate Robin's reply quality after building, use the QA testing workflow in [`skills/robin-conversation-assessment/SKILL.md`](../conversation-assessment/SKILL.md).

---

## Component reference

| # | Component | Configured via |
|---|-----------|---------------|
| 1 | Website knowledge sources | `robin websites add` |
| 2 | Custom instructions / knowledge | `robin agents update --user-instructions` |
| 2 | Goals and persona | `robin agents update --goal-instructions` |
| 3 | Timezone | `robin agents update --time-zone` |
| 4 | Announcement opt-in (START) | Dashboard |
| 5 | Tell me if stumped | Dashboard |
| 6 | Mailchimp signup prompt | `--user-instructions` (the wording) |
| 7 | Connect Mailchimp | Dashboard → Integrations |
| 8 | Mention / keyword alerts | Dashboard |
| 9 | Google Calendar | Dashboard → Integrations |
| 10 | Notion | Dashboard → Integrations (usage rules in `--user-instructions`) |
| 11 | ShowPass | Dashboard → Integrations |
| 12 | Personality sliders | Dashboard |
