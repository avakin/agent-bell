# Creating Custom Themes

You can create your own theme and install it alongside the bundled ones.

## Directory Structure

Create a folder with a `theme.json` manifest and `.wav` sound files:

```
my-theme/
  theme.json
  task-complete.wav
  task-complete-escalated.wav
  needs-input.wav
  needs-input-escalated.wav
  error.wav
```

## Manifest Format

`theme.json`:

```json
{
  "name": "my-theme",
  "description": "Short description",
  "author": "your-name",
  "sounds": {
    "task-complete": "task-complete.wav",
    "task-complete-escalated": "task-complete-escalated.wav",
    "needs-input": "needs-input.wav",
    "needs-input-escalated": "needs-input-escalated.wav",
    "error": "error.wav"
  }
}
```

## Sound Events

The `sounds` object maps event names to `.wav` files. All files must be WAV format.

| Key                       | When it plays                          |
| ------------------------- | -------------------------------------- |
| `task-complete`           | Agent finished its task                |
| `task-complete-escalated` | Escalated variant (louder/more urgent) |
| `needs-input`             | Agent needs your input                 |
| `needs-input-escalated`   | Escalated variant                      |
| `error`                   | Agent hit an error                     |
| `session-start`           | New session started                    |
| `tool-use`                | Agent invoked a tool                   |

Each event can also have an `-escalated` variant. If the escalated variant is missing, the normal sound plays instead.

## Install and Activate

```bash
agent-bell themes add ./my-theme
agent-bell config set theme my-theme
```

User themes are stored in `~/.agent-bell/themes/` and take priority over bundled themes with the same name.
