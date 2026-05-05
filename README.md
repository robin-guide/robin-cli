# Robin CLI

```text
  ▄████▄   ▄████▄   ▄████▄  ██  ███▄  ██
  ██  ██   ██  ██   ██  ██  ██  ████▄ ██
  █████▀   ██  ██   █████▀  ██  ██ ▀█▄██
  ██  ██   ██  ██   ██  ██  ██  ██  ▀███
  ██  ██   ▀████▀   █████▀  ██  ██   ▀██
  ```

Scriptable command-line access to the [Robin](https://robin.guide) platform. Built for humans and automation alike.

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

# List Robins
robin agents list

# Send a message
robin conversations reply <threadId> --content "Hello!"

# Automation-friendly JSON output
robin agents list --json
```

## Interactive Mode

Launch the keyboard-driven terminal UI for browsing Robins, conversations, and customers:

```bash
robin ui
```

Navigate with arrow keys, select with Enter, and go back with `q` or Escape.

The **Customers** path opens a customer dossier showing identity (phone, external ID, opt-in status, tags), context (notes, welcome message), timeline, and any additional API fields. From the dossier, press `c` to open the related conversations list for that Robin.

## Chat Mode

Open a full-screen chat window with a Robin over the same web channel used by the Robin web app:

```bash
# Use the default Robin (set via `robin config set default-agent <id>`)
robin chat

# Or specify a Robin directly
robin chat <agentId>

# Override the API key or base URL for this session
robin chat <agentId> --api-key <key>
```

Controls inside the chat window:

| Input | Action |
|-------|--------|
| Type + `Enter` | Send message |
| `Esc` | Exit chat |
| `/reset` | Clear conversation history on the web channel |
| `/quit` | Exit immediately |

Messages sent here are the same ones visible in the Robin web app's "Test Chat" view for that Robin. If no Robin is provided and no default is configured, a picker is shown first.

## Local Development

Install dependencies once:

```bash
npm install
```

For quick checks while editing:

```bash
npm run typecheck
npm run build
```

To test the local CLI globally, build and link it:

```bash
npm run build:link
robin --help
robin ui
```

After linking, `robin` points at your local checkout. Re-run `npm run build` after code changes so `dist/` is updated before testing. To remove the local link:

```bash
npm run unlink
```

## Proxy Support

`robin` uses Node's built-in `fetch`, which does not automatically honor proxy environment variables. The CLI configures undici's global dispatcher at startup when `ROBIN_PROXY` is set:

```bash
ROBIN_PROXY=http://127.0.0.1:8080 robin agents list
```

Generic proxy environment variables such as `HTTPS_PROXY`, `HTTP_PROXY`, and `ALL_PROXY` are ignored so proxying remains an explicit Robin CLI opt-in.

## Why

Robin users need a fast, scriptable way to interact with the Robin API without hand-rolling HTTP calls. The CLI maps 1:1 to the API surface, with:

- `--json` flag for clean structured output (pipes, jq, automation)
- Human-readable formatted output with loading spinners and error boxes
- Interactive `robin ui` mode for keyboard-first navigation
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
| `ui` | Launch interactive shell |

### Global flags

| Flag | Description |
|------|-------------|
| `--json` | Output raw JSON (for scripting, piping to jq, automation) |
| `--api-key <key>` | Override stored API key |
| `--base-url <url>` | Override stored base URL |
| `--agent <id>` | Override default Robin ID |
| `--team <id>` | Override default team ID |
| `--verbose` | Show request/response details on stderr |

### Destructive commands

`delete` and `remove` commands prompt for confirmation by default. Pass `--yes` to skip:

```bash
robin tags delete <tagId> --yes
robin announcements delete <announcementId> --yes
robin websites remove <agentId> <websiteId> --yes
```

## Docs

- [Getting Started](./docs/getting-started.md)
- [Full Command Reference](./docs/reference.md) — AI-optimized, every flag documented

## Tech

- TypeScript + [Commander.js](https://github.com/tj/commander.js) + [Ink](https://github.com/vadimdemedes/ink)
- Node 18+ (uses built-in `fetch`)
- Config stored at `~/.robin/config.json`

## License

MIT

```
            +nLpOQdX                          qFut@wcz|@t
          lp@@@@DRmYk@@pc>                      F@zLc^ !rB@
     |@@@@DDBqOOmO00YtUB@@@@+                  p@zcZ|>XvR@
    Y@zl!~=   :!nYL0QXn!~~ld@v                c@Jzct!vn#@
    J@n=              ~!<   U@               ihmLzfjun@d
     v@l)hd&@@rLB@@@@@bYrJu  O@              pwCjrJjr@U
   =  +@@x  :h@@@RRp;     ;<  u@            ZddXjztj@r
 @@@@@@#@! +t 0@   r;)nLLOQwdw> LC   ;     OppzfJtr@x
i@(rl(z  q, x(@@jUzYLQLvJpwmOmdOcwm@@l    Xdhv|)t(@n
 J@@QtrzzJhh0ZU(LOLJuY0LZLnzUYQQ0JU#c    cdC)v<FkDz
   cF@R0@Gd0z>trt)lxvzCYULQJJLOCLLYYBGd<)qciY(X@@t
        @mOOOOcfvcuOZbQLQQQQJcYJCCCL0ZkZlr0@btm@c
        @OLXrvY0OJQwcJQQJYYzXzvcuYXYJL>,rd@GpL@d
       (@UzrzcvfjvxnxxXJnvXvuf)rYLGRLn c@@@dqB@bq
       FBD((xtl(tflfnrxzncJLmwvjvJLLurrb@@#F#@@@|
       @bkzvYLnccvcYYLQzvczQZppLt|jjx|zbpGG@@#@@
       @mbqnrvrrrmkRmUczLJzuvvLdQ(+~~<)= :nuqh@@(
       @@b0J> urQO, ;)junxXzYntjY0X!   +LcYB&&@@w:
        @@O@GXfnf++vx)<itvXzzYzcflt<== c@@@@hFu OGv
        =@@qbqXzcz>,l)((|)frnnnnxvcXrnwcftxLCr   x#O
         ^@@kR#DGFGdJUnnnnrnnfnxjtvnjk@@@qR@@@Cq<  O|
           @@@RZh0LZR@FJflxzXvrjnrzX!Y@@#G@@@   vhL;n~
            )@@@@DhmQLdRDw0CYLZJx>;^>,^rQ@Bn      <ffY+
              !@@@@@@DdR#RFk0JvO&@@RCjrlt@           lpX
                 )@@@@@@@O@@@@@@@@@@@@v+iUx            +
                     : d@kwq&hX|)+  px
                       k            h
                     O@            ;@
                    &D             ZQ
                  ,&n              Y>
           +QJ),:QCv     ; um@DRLZL(r |
          =uZmdbFkpG@##bJuJZJOqpR@@@@F@m(li<^
```