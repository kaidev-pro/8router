# Terminal Operator Console

The 8Router Terminal Operator Console is the primary CLI interface for managing the 8Router gateway.

## Layout

The console uses a box-drawn layout with:
- Header: brand name, version, description
- Status: gateway state, PID, port, providers, routing, flags
- URLs: local API, public API, dashboard
- Menu: state-aware interactive menu
- Footer: keybindings

## Menu States

### Gateway Running
- Open Dashboard
- Provider Operations
- System Health
- Run Doctor
- View Logs
- Restart Gateway
- Stop Gateway
- Settings
- Exit

### Gateway Stopped
- Start Gateway
- Open Dashboard
- System Health
- Run Doctor
- Settings
- Exit

## Keybindings

- ↑/↓: Navigate menu
- Enter: Select item
- Esc: Quit/back
- Q: Quit
- R: Refresh status
- Ctrl+C: Safe exit

## URL Configuration

PUBLIC_BASE_URL environment variable controls public URLs.
When not set, public URLs show "Not configured".

## Headless Behavior

When stdin is not a TTY, the console starts the gateway directly.

## Provider Operations

Read-only submenu:
- Provider Credentials (dashboard link)
- Provider Connections (metadata summary)
- Reconciliation Preview
- Migration Plans (list only)
- Shadow Diagnostics (flag + summary)

No write operations (migrate, rollback, enable, delete).

## Secret Masking

No API keys, tokens, or credentials are displayed.
maskSecret() truncates sensitive values.

## Compatibility

- Unicode box drawing with ASCII fallback (ASCII_ONLY env)
- NO_COLOR support
- Terminal width: 60-120 columns
- Linux/macOS/Windows open commands

## Deliberately Deferred

- Provider connection CRUD
- Migration execution
- Rollback execution
- Routing cutover
- Credential editing
- Live traffic testing
