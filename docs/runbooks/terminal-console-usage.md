# Terminal Console Usage

## Quick Start

```bash
8router                  # Interactive menu (TTY) or status (non-TTY)
8router start            # Start gateway
8router status           # Show status
8router doctor           # Health check
```

## Interactive Mode

Run `8router` in a terminal for the interactive operator console.

Keybindings:
- ↑/↓: Navigate
- Enter: Select
- Esc/Q: Quit
- R: Refresh status

## Non-TTY / CI

```bash
8router | head           # Shows status, no process start
echo "" | 8router        # Same
CI=true 8router          # Same
```

## Public URL

Set `PUBLIC_BASE_URL` in environment:

```bash
export PUBLIC_BASE_URL=https://8agents.xyz
8router status           # Shows public API and dashboard URLs
```

## Dashboard

```bash
8router dashboard        # Opens in browser (TTY) or prints URL (non-TTY)
```

## Gateway Control

```bash
8router start            # Start (foreground)
8router stop             # Stop (SIGTERM)
8router restart          # Stop + Start
```

## Security

- No secrets displayed
- Log output redacted
- No implicit process start in non-TTY
- Unknown commands fail with exit 1
