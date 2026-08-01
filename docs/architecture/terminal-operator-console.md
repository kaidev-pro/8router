# Terminal Operator Console

## Interactive vs Non-TTY

**Interactive (TTY):** Full menu with state-aware options, keybindings, real-time status.

**Non-TTY (pipe/CI/cron):** Status-only output, no implicit process start. Exit code 0. Available commands listed. Only explicit subcommands trigger mutations.

## Subcommands

| Command | Behavior |
|---------|----------|
| `8router start` | Start gateway |
| `8router stop` | Stop gateway |
| `8router restart` | Restart gateway |
| `8router status` | Show runtime status (read-only) |
| `8router doctor` | Run health check (read-only) |
| `8router dashboard` | Open dashboard (prints URL if headless) |
| `8router settings` | Show settings (read-only) |
| `8router` (no args, TTY) | Interactive menu |
| `8router` (no args, non-TTY) | Status output only |

Unknown subcommands return exit code 1.

## Public vs Local URLs

- `PUBLIC_BASE_URL` env → Public API and Dashboard URLs
- Missing `PUBLIC_BASE_URL` → "Not configured" for public URLs
- Local URLs always shown regardless
- Local Dashboard always: `http://localhost:<port>/8router/dashboard`
- No localhost URL displayed as "public"

## Headless Dashboard

When TTY unavailable or CI=true:
- Prints public URL if configured
- Prints local URL with "Public URL not configured" hint
- Does NOT call xdg-open/open/start

## Log Masking

All journalctl output passes through `redactLine()` before display.
Patterns: Authorization, Bearer, sk-*, cookie, refresh_token, password, database URL, query-string secrets.

journalctl called with fixed args: `['-u', '8router.service', '-n', '50', '--no-pager', '-o', 'short-iso']`
No shell string concatenation.

## Menu States

**Running:** Dashboard, Provider Ops, Health, Doctor, Logs, Restart, Stop, Settings, Exit
**Stopped:** Dashboard, Provider Ops, Health, Doctor, Start, Settings, Exit

Doctor, Settings, Provider Operations always available regardless of gateway state.

## Mutation Scope

Only `start`, `stop`, `restart` subcommands and interactive Start/Restart/Stop items cause mutations.
All other paths are read-only.

## Deliberately Deferred

- Provider connection CRUD
- Migration execute/rollback
- Credential rotation
- Routing cutover
- Environment editing
- Real-time log follow
