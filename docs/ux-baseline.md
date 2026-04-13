# Robin CLI — UX Baseline

Captured March 2026 as the pre-improvement reference point. All metrics and observations are from static code analysis and interaction model review. Use this doc to measure the impact of UX improvements over time.

---

## Interaction Model (Current)

Every invocation is one-shot: a Commander subcommand fires, the async work completes, then Ink renders the result once and exits. There is no persistent session. Ink is used purely as a static formatter, not as an interactive runtime.

### Output paths

| Condition | Output path |
|---|---|
| `--json` | `process.stdout` (JSON), `process.exit(0)` |
| Human list | Ink `Table` component, exits via `waitUntilExit` |
| Human detail | Ink `DetailView` component, exits via `waitUntilExit` |
| Human delete | Ink `Confirm` → `console.log` + `process.exit(0)` |
| Error (any mode) | `console.error` to stderr, `process.exit(1)` |
| Auth/config ops | `readline` + `console.log` (no Ink) |

---

## Top Tasks (by estimated user frequency)

Ranked by how frequently a Robin platform user would run these commands in a typical work session.

| Rank | Task | Command | Notes |
|---|---|---|---|
| 1 | List / triage conversations | `agents threads <id>` | Most common daily task |
| 2 | Reply to a conversation | `conversations reply <id> --content "…"` | Core workflow action |
| 3 | Pause / resume AI on a thread | `conversations pause/resume <id>` | Frequent escalation flow |
| 4 | Look up a customer | `customers get <id>` / `customers list` | Support lookup |
| 5 | List agents | `agents list` | Setup / orientation |
| 6 | Create / update a tag | `tags create/update` | Setup task |
| 7 | Schedule an announcement | `announcements create <id>` | Periodic campaign work |
| 8 | Bulk import customers | `customers bulk-import` | Infrequent, high consequence |

---

## Known UX Issues (Pre-Improvement)

### Critical (blocks task or produces wrong output)

1. **No loading indicator**: API calls block silently. Users have no signal that a request is in-flight. `Spinner` component exists but is unused.
2. **Ink + console interleaving on delete**: After `Confirm` renders, `onConfirm` calls `console.log` + `process.exit(0)` while Ink may still hold the terminal. This can produce duplicate or jumbled output.
3. **ErrorBox never shown**: `ErrorBox` component exists but is unused. All errors bypass Ink and print plain `console.error` to stderr, even in human mode.
4. **`DetialView` with empty data crashes**: `Math.max(...[])` on an empty entries array returns `-Infinity`, causing `padEnd` misbehaviour.

### High (degrades experience noticeably)

5. **`Confirm` does not accept Enter as default No**: Standard CLI convention is Enter = default answer. Users expecting Enter = No will accidentally be stuck waiting.
6. **`Confirm` ignores Escape**: No way to cancel via Escape key.
7. **`websites remove` has no `--yes` flag**: Inconsistent with other delete commands; always prompts, cannot be scripted without piping.
8. **Table width ignores terminal width**: 40-char cap is static. Wide terminals show cramped columns; narrow terminals overflow.
9. **Auth login shows API key in cleartext**: No masking during interactive input.

### Medium (inconsistent or confusing)

10. **Mixed I/O models**: Auth uses readline, config uses console, API commands use Ink. The UX vocabulary is split across three different rendering systems.
11. **README claims spinners**: "Human-readable formatted output (tables, colors, spinners)" — spinners are not implemented.
12. **Long values in DetailView have no wrapping**: JSON objects render as a single long line with no terminal-width awareness.
13. **Unused dependencies**: `ink-confirm-input`, `ink-select-input`, `ink-text-input` are listed in `package.json` but unused.

---

## Metrics Baseline (Pre-Improvement)

These are the observable behaviors before changes are applied.

| Metric | Baseline | Target |
|---|---|---|
| Time-to-feedback (command start → first output) | 0 ms (silent while in-flight) | < 100 ms (spinner appears) |
| Error output format consistency | 0% Ink-rendered errors | 100% Ink-rendered errors in human mode |
| Delete flow safety (Ink/console interleave) | 2 of 3 delete commands affected | 0 affected |
| Confirm keyboard completeness | 2 keys (y/n) | 4 keys (y/n/Enter/Escape) |
| Commands with loading UI | 0 / 38 subcommands | 38 / 38 subcommands |
| Commands with `--yes` flag | 2 (tags delete, announcements delete) | 3 (add websites remove) |
| Terminal-adaptive Table | No | Yes |

---

## Architecture Constraints Carried Forward

- JSON mode must remain stable: same stdout shape, same exit codes, same error format.
- The one-shot Commander dispatch pattern is preserved for all non-interactive commands.
- The interactive shell (`robin ui`) is additive — it does not replace existing commands.
- Ink v5.2.1 is installed; `useApp()` exposes only `{ exit(err?: Error): void }`. No `waitUntilRenderFlush`.
