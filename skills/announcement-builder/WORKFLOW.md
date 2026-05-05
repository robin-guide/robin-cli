# Robin Announcement Builder - Workflow

Plan, write, target, and schedule a Robin announcement.

---

## Phase 1: Discovery

Run a short discovery conversation before creating anything. One question at a time.

Typical arc:

1. **What's the announcement for?** - Event update, reminder, delay, sale, operational notice, follow-up?
2. **Who should receive it?** - Specific tag, several tags, phone numbers, or one customer?
3. **When should it send?** - Date and time.
4. **What should contacts do next?** - Show up, reply, click a link, bring something, ignore if not relevant?
5. **Any constraints?** - Character limit, brand tone, required wording, words to avoid, attachments/media?

If the owner already provides the audience, copy, and send time, move to validation instead of asking all questions.

---

## Phase 2: Pre-Flight Checklist

**Run this before scheduling any announcement. Every time.**

### 1. Resolve the Robin

Use the configured default, or list Robins and ask which one to use.

```bash
AGENT_ID=$(robin config get default-agent 2>/dev/null)
robin agents get "$AGENT_ID" --json
```

### 2. Confirm announcement opt-in is enabled

Broadcasts only work well when contacts have opted in. If the owner has not enabled announcement opt-in, flag the dashboard step:

Dashboard -> Robin settings -> Announcements -> enable announcement opt-in / START keyword.

### 3. Choose tags deliberately

List available tags:

```bash
robin tags list --agent "$AGENT_ID" --json
```

For each candidate tag, inspect what it means before using it. Prefer tags that describe a real consented audience, not internal labels that may be stale.

Good announcement tags:

- `ticket-holders`
- `vip`
- `vendors`
- `volunteers`
- `saturday-attendees`

Risky announcement tags:

- Broad catch-all tags like `all`, unless the owner explicitly wants everyone
- Operational tags like `needs-review`, `import-2024`, or `test`
- Tags whose purpose is unclear or whose membership has not been checked

### 4. Estimate audience size

Use tag counts before final confirmation:

```bash
robin announcements tag-counts "$AGENT_ID" --tag-ids tag_1 tag_2 --json
```

If a tag count looks surprisingly high or low, pause and verify before scheduling.

For sensitive sends, spot-check customers in the tag:

```bash
robin customers list --agent "$AGENT_ID" --tag-id tag_1 --page-size 25 --json
```

### 5. Avoid duplicate or conflicting announcements

Review scheduled and recent announcements:

```bash
robin announcements list "$AGENT_ID" --json
```

Check for duplicate reminders, stale drafts, or another scheduled announcement going to the same audience at nearly the same time.

---

## Phase 3: Write the Announcement

### Message principles

SMS announcements should be direct and useful. Most should be 1-3 short sentences.

Good announcement copy:

- Names the event, venue, or context early
- Says what changed or what matters now
- Gives the action or expectation
- Includes the time/date only when relevant
- Sounds like the Robin's brand, not a marketing blast

Avoid:

- Vague intros: "Exciting news!" without substance
- Overlong paragraphs
- Multiple calls to action
- Information that depends on a live page unless a link or clear source is included
- Promises Robin cannot fulfill

### Standard copy pattern

```text
[Context]: [important update]. [What to do / what happens next]. [Optional reply instruction or link].
```

Examples:

```text
Feather Fest update: Gates open at 4pm today, and the north parking lot is full. Use the west entrance if you're driving in.
```

```text
Reminder: Volunteer check-in starts at 8:30am tomorrow at the main info tent. Reply here if you cannot make your shift.
```

```text
Tonight's show is delayed 30 minutes due to weather. Doors now open at 7:30pm and the opener starts at 8:15pm.
```

### Calls to action

Use one clear action. If the Robin should handle replies, say that naturally:

```text
Reply here if you have accessibility questions before arriving.
```

If the owner wants a link, include only one link and make the surrounding text explain why it matters.

### Media

If a media asset should be attached, confirm the asset ID before scheduling:

```bash
--media-asset-id media_123
```

Do not imply an attachment exists unless the owner provided or selected one.

---

## Phase 4: Scheduling

The CLI expects `--send-at <ISO>`. Use an explicit ISO timestamp and confirm it before scheduling.

### Scheduling judgment

Prefer local waking hours unless the owner says otherwise:

- Event reminders: 24 hours before, morning of, or 2-4 hours before doors
- Operational changes: as soon as the change is verified
- Sales or registration: mid-morning or early evening
- Urgent safety/weather updates: immediately, with plain wording

Avoid scheduling broad announcements late at night, very early morning, or during another expected broadcast unless it is urgent.

---

## Phase 5: Create or Update

### Tagged announcement

```bash
robin announcements create "$AGENT_ID" \
  --title "Doors Reminder" \
  --content "$(cat <<'EOF'
Doors open at 7pm tonight. Have your ticket ready and use the west entrance for the fastest line.
EOF
)" \
  --send-at "2025-07-01T01:00:00Z" \
  --tag-ids tag_1 tag_2
```

### Phone-number announcement

Use phone numbers only when the owner intentionally provides a small target list. Prefer tags for reusable audiences.

```bash
robin announcements create "$AGENT_ID" \
  --title "Vendor Load-In Reminder" \
  --content "Vendor load-in starts at 8am tomorrow at Gate B. Reply here if you're running late." \
  --send-at "2025-07-01T14:00:00Z" \
  --phone-numbers "+15551234567" "+15557654321"
```

### Single customer scheduled message

Use this for one customer, not a broadcast:

```bash
robin announcements schedule-message "$AGENT_ID" \
  --customer cust_123 \
  --content "Your appointment is tomorrow at 10am. Reply here if you need to reschedule." \
  --send-at "2025-07-01T16:00:00Z"
```

### Update a scheduled announcement

```bash
robin announcements update ann_123 \
  --content "Updated copy here" \
  --send-at "2025-07-01T16:00:00Z" \
  --tag-ids tag_1 tag_2
```

### Delete a scheduled announcement

```bash
robin announcements delete ann_123 --yes
```

Only delete when the owner explicitly confirms cancellation.

---

## Phase 6: Final Confirmation

Before running the create or update command, show:

- Robin name
- Audience: tag names and IDs, phone numbers, or customer ID
- Estimated tag audience count when available
- Send time
- Exact `--send-at` ISO value
- Final title and content
- Media asset ID, if any

Ask for explicit confirmation before scheduling a broad announcement.

After scheduling, return the announcement ID and restate the send time.

---

## Common Fixes

### The user gives only a relative time

Ask for a specific send time:

```text
What exact date and time should I use for "tomorrow at 9am"?
```

### The tag list is unclear

Ask the owner to choose between named tags after showing counts. Do not guess from tag names alone when the blast has risk.

### The copy is too long

Compress to the minimum useful message. Preserve facts, action, and time; remove hype and filler.

### The owner wants "everyone"

Confirm what "everyone" means in Robin: all opted-in contacts, a specific all-customers tag, or a phone-number list. Check counts before scheduling.
