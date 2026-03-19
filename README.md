# agent-bell

**Audio notifications for AI coding agents — never miss when your agent finishes, errors, or needs input.**

[![npm version](https://img.shields.io/npm/v/agent-bell)](https://www.npmjs.com/package/agent-bell)
[![license](https://img.shields.io/npm/l/agent-bell)](LICENSE)
[![node](https://img.shields.io/node/v/agent-bell)](package.json)

---

## What it does

agent-bell plays sound notifications when your AI coding agent completes a task, hits an error, or needs your input. It hooks directly into **Claude Code**, **Cursor**, **Gemini CLI**, and **OpenCode** so you can step away from your terminal and still know what's happening.

- Themed audio notifications with escalation (louder if you don't respond)
- Desktop banner notifications (clickable — raises the right window)
- Terminal bell, text-to-speech, and tmux status line alerts
- Per-tool cooldowns to prevent notification spam
- Zero config needed — `npx agent-bell init` walks you through everything

## Quick Start

```bash
npx agent-bell init
```

The interactive wizard will:

1. Detect your installed AI tools (Claude Code, Cursor, Gemini CLI, OpenCode)
2. Let you pick events, notification methods, and a sound theme
3. Install hooks automatically — you're done

Or install globally: `npm install -g agent-bell`

To update: `npm update -g agent-bell` (or `npx agent-bell@latest init` if using npx).

After updating, run `agent-bell doctor` to verify your setup. If you've customized hooks, re-run `agent-bell init` to pick up any new events or hook format changes.

## Supported Tools

| Tool            | Hook mechanism                                                                  |
| --------------- | ------------------------------------------------------------------------------- |
| **Claude Code** | Writes to `~/.claude/settings.json` — hooks on `Stop` and `Notification` events |
| **Cursor**      | Installs event hooks in Cursor's config                                         |
| **Gemini CLI**  | Writes to Gemini's settings file with matcher-based hooks                       |
| **OpenCode**    | Writes to OpenCode's config with event-based plugin                             |

Hooks call `agent-bell play <event> --source <tool>`, which is a fast-path command that skips loading the full CLI framework.

## Events

| Event           | Description                                               | Default |
| --------------- | --------------------------------------------------------- | ------- |
| `task-complete` | Agent finished its task                                   | On      |
| `needs-input`   | Agent is waiting for your input (permission prompt, idle) | On      |
| `error`         | Agent encountered an error                                | On      |
| `session-start` | New agent session started                                 | Off     |
| `tool-use`      | Agent invoked a tool                                      | Off     |

## Notification Methods

| Method            | Description                                             | Default |
| ----------------- | ------------------------------------------------------- | ------- |
| **Sound**         | Plays themed `.wav` files via system audio              | On      |
| **Desktop**       | macOS/Linux banner notification (click to focus window) | On      |
| **Terminal bell** | Triggers your terminal's built-in bell (`\a`)           | On      |
| **Say (TTS)**     | Text-to-speech announcement of the event                | Off     |
| **Tmux**          | Sets tmux status line alert flag                        | Off     |

## Sound Themes

Three bundled themes, each with normal and escalated variants:

| Theme                  | Vibe                                    |
| ---------------------- | --------------------------------------- |
| **galactic** (default) | Spacey, futuristic notification sounds  |
| **arcane**             | Mystical, magical notification sounds   |
| **cyberpunk**          | Neon-edged, glitchy notification sounds |

Preview a theme:

```bash
agent-bell themes preview galactic
```

Add your own theme from a directory containing a `theme.json` manifest and `.wav` files:

```bash
agent-bell themes add ./my-theme
```

Want to create your own? See [Creating Custom Themes](docs/custom-themes.md).

## Smart Features

### Cooldown

Prevents notification spam. Default: **3 seconds** between notifications per tool. If an event fires within the cooldown window, it's silently skipped.

### Escalation

If you don't respond within **30 seconds** (configurable), the next notification plays an escalated sound variant — louder and more attention-grabbing. This resets once you interact with the tool.

## Configuration & CLI

Config is stored at `~/.agent-bell/config.json`. Manage it with the CLI:

```bash
agent-bell config show           # View current config
agent-bell config set theme cyberpunk
agent-bell config set volume 0.5
agent-bell config set cooldown 5
agent-bell config set notifications.say true
```

Dotted keys are supported for nested values (e.g., `notifications.desktop`, `tools.claude.enabled`).

| Command                               | Description                                                          |
| ------------------------------------- | -------------------------------------------------------------------- |
| `agent-bell init`                     | Interactive setup wizard                                             |
| `agent-bell play <event>`             | Play a notification sound (invoked by hooks)                         |
| `agent-bell config show`              | Show current configuration                                           |
| `agent-bell config set <key> <value>` | Set a configuration value                                            |
| `agent-bell themes list`              | List available themes                                                |
| `agent-bell themes preview <name>`    | Preview a theme's sounds                                             |
| `agent-bell themes add <path>`        | Add a custom theme from a directory                                  |
| `agent-bell status`                   | Show current setup and hook status                                   |
| `agent-bell pause`                    | Temporarily silence all notifications                                |
| `agent-bell resume`                   | Resume notifications after pausing                                   |
| `agent-bell test`                     | Fire a test notification to verify your setup                        |
| `agent-bell doctor`                   | Diagnose common issues with your setup                               |
| `agent-bell uninstall`                | Remove all hooks (`--remove-config` to also delete `~/.agent-bell/`) |

## Tips

### Reduce noise with agent permissions

Every Claude Code permission prompt fires a `needs-input` notification. Grant your agent basic read-only permissions to eliminate those prompts. Add the following to `~/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Bash(cat:*)", "Bash(find:*)", "Bash(grep:*)",
      "Bash(head:*)", "Bash(tail:*)", "Bash(wc:*)", "Bash(ls:*)",
      "Bash(gh api:*)", "Bash(gh pr view:*)", "Bash(gh pr list:*)",
      "Bash(gh pr checks:*)", "Bash(gh pr diff:*)", "Bash(gh repo view:*)",
      "Bash(gh run view:*)", "Bash(gh run list:*)",
      "Bash(gh issue view:*)", "Bash(gh issue list:*)",
      "Bash(gh workflow list:*)", "Bash(gh workflow view:*)"
    ]
  }
}
```

The same principle applies to other tools — the more you pre-grant, the fewer interruptions.

### Tune cooldown for your workflow

If your agent invokes many tools in quick succession, increase the cooldown to avoid rapid-fire notifications:

```bash
agent-bell config set cooldown 10
```

## FAQ

**How do I update?**
`npm update -g agent-bell` or `npx agent-bell@latest init`. Run `agent-bell doctor` after.

**Too many `needs-input` notifications?**
Grant your agent read-only permissions to reduce permission prompts. See [Tips](#reduce-noise-with-agent-permissions).

**Can I use it without a global install?**
Yes — `npx agent-bell init` works without installing globally.

**How do I temporarily silence notifications?**
`agent-bell pause` to silence, `agent-bell resume` to bring them back.

**Notifications not playing?**
Run `agent-bell doctor` and `agent-bell test`. Check your hooks with `agent-bell status`.

**Does it work on Linux?**
Sound and desktop notifications work. TTS needs `espeak` or similar.

**Different settings per tool?**
Not yet — on the roadmap. All tools share one config.

## How It Works

1. `agent-bell init` installs hooks into your AI tool's config files
2. When the tool fires an event (e.g., task complete), the hook runs `agent-bell play <event>`
3. The `play` command takes a fast path — it skips Commander and loads only what's needed
4. Based on your config, it plays a sound, sends a desktop notification, rings the terminal bell, etc.
5. Cooldown and escalation logic prevent spam while ensuring you don't miss important events

## Requirements

- **Node.js** >= 18
- **macOS** (primary) — full support for all notification methods
- **Linux** — sound and desktop notifications work; TTS requires `espeak` or similar

## License

[MIT](LICENSE)
