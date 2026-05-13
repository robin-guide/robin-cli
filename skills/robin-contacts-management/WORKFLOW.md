# Robin Contacts Management — Bulk Import Workflow

Import a list of contacts into a Robin agent: normalize the source data, validate, run the import, and verify the result.

---

## Phase 1: Discovery

Run a short discovery conversation before touching any data. One question at a time.

Typical arc:

1. **Where is the contact list coming from?** — CSV export, spreadsheet, ticketing platform (ShowPass, Eventbrite), vendor list, Mailchimp export?
2. **Do you have permission to send these people texts?** — This is a hard stop. Before setting `optedIn: true` on any contact, the user must confirm that these contacts have explicitly consented to receive SMS messages from this Robin. Ask: *"Can you confirm these contacts have agreed to receive texts — for example, by opting in at ticket purchase, signing up at your venue, or via a web form?"* If the answer is anything other than a clear yes, set `optedIn: false` and let contacts opt in by texting START instead.
3. **Should they receive tags on import?** — Same tag for everyone, multiple tags, or no tag at this stage?
4. **Is there a welcome message?** — Should Robin send a message when any of these contacts first text in? (Goes on the contact, not the tag — confirm scope.)
5. **Is this a first import or an update?** — First time: full list. Update: only new or changed rows, or full replace?

If the user provides all of this upfront, move straight to pre-flight.

---

## Phase 2: Pre-Flight Checklist

**Run every step before submitting the import.**

### 1. Resolve the Robin

```bash
AGENT_ID=$(robin config get default-agent 2>/dev/null)
robin agents get "$AGENT_ID" --json | jq '.name, .id'
```

Confirm the Robin name with the user. Tags and contacts are agent-scoped — importing under the wrong Robin creates orphaned records.

### 2. Confirm consent before setting optedIn

**This step is mandatory. Do not skip it.**

Before setting `optedIn: true` on any contact in the import file, get explicit confirmation from the user:

> "These contacts will be marked as opted in to receive messages from this Robin. Please confirm: did each of these contacts agree to receive texts — for example, via a ticket purchase opt-in, a sign-up form, or a venue check-in?"

If the user confirms consent clearly, proceed with `"optedIn": true` in the JSON.

If the user is unsure, hedges, or cannot name the consent mechanism:
- Set `"optedIn": false` on all contacts (or omit the field entirely — it defaults to false)
- Explain that contacts can opt in themselves by texting START, and that their first reply to Robin will also be captured as a signal of engagement
- Do not set `optedIn: true` as a convenience or assumption

> Marking contacts as opted in without genuine consent exposes the Robin owner to SMS compliance risk (TCPA in the US, CASL in Canada). When in doubt, default to false.

### 3. Convert the source to contacts JSON

The CLI `bulk-import` command requires a **JSON array**. It does not accept CSV directly.

If the user provides a CSV, convert it first. For a standard CSV with `name` and `phone` columns:

```bash
python3 - <<'EOF'
import csv, json, sys

with open('contacts.csv', newline='', encoding='utf-8-sig') as f:
    rows = list(csv.DictReader(f))

# Map CSV column names to the expected fields — adjust as needed
contacts = []
for r in rows:
    contacts.append({
        "name":  r.get("name") or r.get("Name") or r.get("full_name", "").strip(),
        "phone": r.get("phone") or r.get("Phone") or r.get("mobile", "").strip(),
    })

with open('contacts_raw.json', 'w') as f:
    json.dump(contacts, f, indent=2)

print(f"Converted {len(contacts)} rows")
EOF
```

Adjust column names to match the actual CSV headers before running.

Required fields per contact:

| Field | Required | Description |
|-------|----------|-------------|
| `phone` | Yes | E.164 format — see step 3 |
| `name` | Recommended | Display name |
| `notes` | No | Internal notes |
| `optedIn` | No | `true` only with confirmed consent |
| `welcomeMessage` | No | Override per-contact welcome |

### 4. Normalize phone numbers to E.164

The API rejects phones that aren't in `+15551234567` format. Fix locally before importing.

```python
import json, re

def normalize_phone(raw):
    digits = re.sub(r'\D', '', raw or '')
    if len(digits) == 10:
        return f'+1{digits}'           # assume North America
    if len(digits) == 11 and digits[0] == '1':
        return f'+{digits}'
    if len(digits) > 11:
        return f'+{digits}'            # international — preserve as-is
    return None                        # unfixable

with open('contacts_raw.json') as f:
    contacts = json.load(f)

clean, rejected = [], []
for c in contacts:
    normalized = normalize_phone(c.get('phone', ''))
    if normalized:
        c['phone'] = normalized
        clean.append(c)
    else:
        rejected.append(c)

with open('contacts_clean.json', 'w') as f:
    json.dump(clean, f, indent=2)

print(f"Clean: {len(clean)}  |  Rejected (no valid phone): {len(rejected)}")
if rejected:
    print("Sample rejected:", rejected[:3])
```

> Only assume `+1` (North America) if the user confirms the source list is US/CA numbers. For international lists, preserve as-is and let the user review unfixable rows.

### 5. Deduplicate by phone

```python
import json

with open('contacts_clean.json') as f:
    contacts = json.load(f)

seen, deduped, dupes = set(), [], []
for c in contacts:
    if c['phone'] in seen:
        dupes.append(c)
    else:
        seen.add(c['phone'])
        deduped.append(c)

with open('contacts_clean.json', 'w') as f:
    json.dump(deduped, f, indent=2)

print(f"Kept: {len(deduped)}  |  Removed duplicates: {len(dupes)}")
```

Report the duplicate count to the user before proceeding.

### 6. Pre-resolve all tags

Never pass a tag ID that doesn't exist — the import will partially fail with an unclear error.

```bash
# List all tags for this Robin
robin tags list --agent "$AGENT_ID" --json
```

For each tag ID you plan to pass with `--tag-ids`:
- Confirm it appears in the list
- Confirm its name matches what the user intended
- If a tag doesn't exist yet, create it first:

```bash
robin tags create --agent "$AGENT_ID" --name "Ticket Holders"
```

Copy the returned tag ID before running the import.

### 7. Spot-check the file

Before submitting, read 2–3 rows from the cleaned file and show the user:

```bash
python3 -c "import json; data=json.load(open('contacts_clean.json')); print(json.dumps(data[:3], indent=2)); print(f'Total: {len(data)}')"
```

Get explicit confirmation before running the import.

---

## Phase 3: Run the Import

```bash
robin customers bulk-import \
  --agent "$AGENT_ID" \
  --file contacts_clean.json \
  --tag-ids tag_1 tag_2
```

Omit `--tag-ids` if no tagging is needed at import time.

The response returns a summary: contacts created, skipped (phone already exists), and failed. Capture it:

```bash
robin customers bulk-import \
  --agent "$AGENT_ID" \
  --file contacts_clean.json \
  --tag-ids tag_1 \
  --json | tee import_result.json
```

---

## Phase 4: Verify

Spot-check the result before handing off.

```bash
# Check membership in the assigned tag
robin customers list \
  --agent "$AGENT_ID" \
  --tag-id tag_1 \
  --page-size 25 \
  --json

# Check audience size for announcement planning
robin announcements tag-counts "$AGENT_ID" \
  --tag-ids tag_1 \
  --json
```

The tag-counts figure should be close to the number of imported contacts. A large gap usually means:
- The import ran under a different Robin (`--agent` mismatch)
- Contacts were skipped (duplicate phones already on file)
- The tag ID passed to `--tag-ids` didn't match the tag you expected

---

## Phase 5: Handoff

Report back to the user:

- Contacts created (from the import response)
- Contacts skipped — with sample phone numbers if available, so the user can investigate
- Tags assigned
- Spot-check command they can run to verify membership: `robin customers list --tag-id <id>`
- Dashboard follow-ups, if applicable:
  - If these contacts will receive broadcasts → enable announcement opt-in at Dashboard → Robin settings → Announcements
  - If a welcome message was set → confirm it fires as expected by texting in from a test number

---

## Common Fixes

### "The user gave me a CSV"

Do not call the API with CSV. Convert it first using the Python snippet in Phase 2, step 2. Check the column headers before mapping — they vary by export source.

### "Some rows failed"

Extract the failed rows from the import response and re-run with only those:

```python
import json

with open('import_result.json') as f:
    result = json.load(f)

failed_phones = {r['phone'] for r in result.get('failed', [])}

with open('contacts_clean.json') as f:
    contacts = json.load(f)

retry = [c for c in contacts if c['phone'] in failed_phones]

with open('contacts_retry.json', 'w') as f:
    json.dump(retry, f, indent=2)

print(f"Retry file has {len(retry)} rows")
```

Fix the phone formatting or other field issues before re-running `bulk-import` with `contacts_retry.json`.

### "Contacts were imported under the wrong Robin"

Contacts and tags are agent-scoped. If the import ran under the wrong Robin:
1. Identify the correct Robin with `robin agents list --json`
2. Re-run the import with `--agent <correctAgentId>`
3. The contacts created under the wrong Robin will need to be handled manually or via support — the CLI has no bulk-delete for contacts

Always confirm the Robin name before submitting.

### "I need to add more contacts to an existing tag"

Run a fresh import with only the new contacts and include the existing tag ID in `--tag-ids`. The import skips contacts that already exist by phone, so re-submitting the full list is safe — it won't duplicate existing contacts, but it will assign the tag to any contacts already on file.

### "I need to assign a tag to contacts that are already imported"

For a small list (< 10), use:

```bash
robin tags assign <customerId> --tag <tagId>
```

For a larger list, build a contacts JSON of just those contacts (with their existing phone numbers), then re-run bulk-import with `--tag-ids`. This is more reliable than looping `tags assign` manually.
