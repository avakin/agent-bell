# agent-bell: Feature Roadmap

## Context

agent-bell is a TypeScript CLI tool that provides audio/visual notifications when AI coding agents (Claude Code, Cursor, Gemini CLI) complete tasks, need input, or encounter errors. It currently supports 5 notification methods (sound, desktop, terminal bell, TTS, tmux), 3 bundled sound themes, smart cooldown/escalation, and an interactive setup wizard. The project is at v0.1.0 with no README or npm publish yet.

This roadmap identifies features that would be most valuable to implement, organized by category and priority.

---

## Top 10 Highest-Impact Features

| # | Feature | Category | Effort | Why |
|---|---------|----------|--------|-----|
| 1 | README + npm publish | Distribution | Small | Zero adoption without discoverability |
| 2 | `agent-bell doctor` | UX | Small | Replaces hours of debugging for new users |
| 3 | Error logging to file | Reliability | Small | Silent error swallowing makes debugging impossible |
| 4 | Config validation | Reliability | Small | Prevents broken configs (volume 999, invalid themes) |
| 5 | Spawned process timeout | Reliability | Small | Prevents zombie `afplay`/`osascript` processes |
| 6 | `agent-bell test` | UX | Small | Critical for first-run confidence |
| 7 | `agent-bell pause/resume` | UX | Small | Most-requested pattern for notification tools |
| 8 | Webhook notification method | Notifications | Medium | Unlocks Slack, Discord, Home Assistant with one feature |
| 9 | Windsurf integration | Integrations | Small | Large user base, same pattern as existing hooks |
| 10 | Test coverage + CI | Reliability | Small-Medium | Protects against regressions as codebase grows |

---

## All Features by Category

### 1. New Integrations

| Feature | Description | Value | Effort | Priority |
|---------|-------------|-------|--------|----------|
| **Windsurf/Codeium** | Same hook pattern as Cursor. Large growing user base. | High | Small | P0 |
| **Aider** | Popular open-source AI CLI. Hook via `.aider.conf.yml` or wrapper script. | Medium | Medium | P1 |
| **Generic listener mode** | `agent-bell listen` — accept events via stdin, local HTTP, or Unix socket. Lets any tool integrate without a dedicated hook module. | High | Medium | P1 |
| **GitHub Copilot CLI** | As Copilot expands to agent workflows, early support captures users. | Medium | Medium | P2 |
| **VS Code extension wrapper** | Thin extension triggering `agent-bell play` on extension host events. | High | Large | P2 |

### 2. New Notification Methods

| Feature | Description | Value | Effort | Priority |
|---------|-------------|-------|--------|----------|
| **Webhook/HTTP POST** | POST to user-configured URL. Enables Slack, Discord, IFTTT, Home Assistant. | High | Small | P0 |
| **Pushover/ntfy push** | Push to phone. Useful when developer walks away from machine. | Medium | Small | P1 |
| **macOS Focus awareness** | Detect Do Not Disturb and suppress/queue or reduce to terminal bell. | Medium | Small | P1 |
| **Slack/Discord bot** | Direct message user on task completion. Great for long-running tasks. | Medium | Medium | P2 |
| **LED/keyboard flash** | Flash keyboard backlight on supported hardware. Niche but cool. | Low | Large | P3 |

### 3. UX Improvements

| Feature | Description | Value | Effort | Priority |
|---------|-------------|-------|--------|----------|
| **`agent-bell test`** | Fire test notification through all enabled methods with pass/fail feedback. | High | Small | P0 |
| **`agent-bell doctor`** | Diagnose issues: check audio player, sound files, hook integrity, config validity. | High | Small | P0 |
| **`agent-bell pause/resume`** | Temporarily disable notifications without modifying config. Flag file in state. | High | Small | P0 |
| **Shell completions** | Generate bash/zsh/fish completions. Commander supports this natively. | Medium | Small | P1 |
| **Quiet hours / schedule** | Time ranges where notifications suppress or reduce (e.g., terminal bell only after 10pm). | Medium | Small | P1 |
| **Per-tool notification overrides** | Different methods per tool (Claude gets sound+desktop, Cursor gets terminal bell only). | Medium | Medium | P2 |
| **Formatted `config show`** | Color, grouping, and labels instead of raw JSON dump. | Low | Small | P2 |

### 4. Reliability & Quality

| Feature | Description | Value | Effort | Priority |
|---------|-------------|-------|--------|----------|
| **Error logging to file** | Write to `~/.agent-bell/error.log` instead of swallowing. Essential for debugging. | High | Small | P0 |
| **Config validation** | Validate ranges (volume 0-1, cooldown >= 0), theme names, event names on `config set`. | High | Small | P0 |
| **Spawned process timeout** | 10s timeout on all `spawn()` calls. Kill hung `afplay`/`osascript`/`say`. | Medium | Small | P0 |
| **CI pipeline** | GitHub Actions: `npm test` + `npm run build` on push. | High | Small | P0 |
| **Cursor/Gemini hook tests** | Same pattern as existing claude.test.ts. Currently untested. | High | Small | P0 |
| **Notifier tests** | Test spawn calls and error handling for all 5 notification methods. | High | Medium | P1 |
| **Command handler tests** | Tests for config, themes, status, uninstall commands. | Medium | Medium | P1 |
| **Atomic state writes** | `state-manager.ts` uses plain `writeFileSync` — should use atomic writes like config does. | Medium | Small | P1 |
| **Integration smoke test** | End-to-end: init → config → hooks → play → verify notifications invoked. | Medium | Medium | P2 |

### 5. Customization

| Feature | Description | Value | Effort | Priority |
|---------|-------------|-------|--------|----------|
| **Per-event volume levels** | Different volumes per event (errors loud, tool-use quiet). | Medium | Small | P1 |
| **Sound file overrides** | `~/.agent-bell/sounds/task-complete.wav` overrides active theme without full custom theme. | Medium | Small | P1 |
| **Custom TTS messages** | Configure what `say` speaks per event instead of hardcoded labels. | Low | Small | P2 |
| **Per-event notification methods** | Sound for task-complete, terminal bell only for tool-use. | Medium | Medium | P2 |
| **Cooldown per event type** | Different cooldowns per event (1s for errors, 10s for tool-use). | Medium | Small | P2 |
| **Theme marketplace** | `agent-bell themes search` from a central registry. | Low | Large | P3 |

### 6. Analytics & Insights

| Feature | Description | Value | Effort | Priority |
|---------|-------------|-------|--------|----------|
| **Event history log** | Append to `~/.agent-bell/history.jsonl` with timestamp, event, source, escalated flag. | Medium | Small | P1 |
| **`agent-bell stats`** | Summary: events by type/tool, events per day/hour, most common event. | Medium | Small | P1 |
| **Session duration tracking** | Time between session-start and task-complete per tool. AI productivity insights. | Medium | Medium | P2 |
| **Daily/weekly digest** | Scheduled summary of notification activity. | Low | Medium | P3 |

### 7. Distribution & Packaging

| Feature | Description | Value | Effort | Priority |
|---------|-------------|-------|--------|----------|
| **README** | What it does, GIF demo, install, quick start, config reference. Critical for adoption. | High | Small | P0 |
| **npm publish** | `package.json` is ready. `npx agent-bell init` would be ideal onboarding. | High | Small | P0 |
| **Homebrew formula** | `brew install agent-bell` — natural for macOS developer audience. | High | Medium | P1 |
| **Single binary** | Use `bun build --compile` or `pkg`. Eliminates Node.js dependency. | Medium | Medium | P2 |
| **Windows support** | PowerShell audio, Windows toast notifications, Windows config paths. | Medium | Large | P2 |
| **Docker/devcontainer** | Detect container environment, fall back to webhook-only. | Low | Small | P2 |
| **Auto-update** | Check for new versions, notify user. | Low | Medium | P3 |

---

## Suggested Implementation Order

### Phase 1: Ship-ready (P0 — small effort, high impact)

1. README with install instructions and demo
2. npm publish
3. Error logging to `~/.agent-bell/error.log`
4. Config validation on `config set`
5. Spawned process timeout (10s kill)
6. `agent-bell test` command
7. `agent-bell doctor` command
8. `agent-bell pause/resume`
9. CI pipeline (GitHub Actions)
10. Cursor + Gemini hook tests

### Phase 2: Expand reach (P1)

1. Windsurf integration
2. Webhook notification method
3. Shell completions
4. Homebrew formula
5. Event history log + `agent-bell stats`
6. Per-event volume levels
7. Sound file overrides
8. Quiet hours / schedule
9. Pushover/ntfy push notifications
10. Notifier + command tests
11. Atomic state writes

### Phase 3: Power features (P2)

1. Generic listener mode (`agent-bell listen`)
2. Aider integration
3. Per-tool and per-event notification method overrides
4. Session duration tracking
5. Windows support
6. Single binary distribution

### Phase 4: Future (P3)

1. Theme marketplace
2. LED/keyboard flash
3. Auto-update mechanism
4. Daily/weekly digest
