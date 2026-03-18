import { log } from "../utils/logger.js";
import { detectInstalledTools } from "../utils/detect-tools.js";
import { saveConfig } from "../core/config-manager.js";
import { listThemes, resolveSoundFile } from "../core/theme-manager.js";
import { playSound } from "../core/audio.js";
import { installClaudeHooks } from "../hooks/claude.js";
import { installCursorHooks } from "../hooks/cursor.js";
import { installGeminiHooks } from "../hooks/gemini.js";
import * as desktop from "../core/notifiers/desktop.js";
import { checkAccessibility, openAccessibilitySettings } from "../utils/accessibility.js";
import { getPlatform } from "../utils/platform.js";
import type { AgentBellConfig, ToolName, BellEvent } from "../types/index.js";
import { DEFAULT_CONFIG } from "../types/index.js";

export async function initCommand(): Promise<void> {
  // Lazy-load inquirer
  const { default: inquirer } = await import("inquirer");

  log.banner();
  console.log("  Welcome to the agent-bell setup wizard!\n");

  // Step 1: Detect tools
  const tools = detectInstalledTools();
  console.log("  Detected AI tools:\n");
  for (const tool of tools) {
    const status = tool.detected ? "\u2714 found" : "\u2716 not found";
    const color = tool.detected ? "\x1b[32m" : "\x1b[90m";
    console.log(`  ${color}  ${status}\x1b[0m  ${tool.label}`);
  }
  console.log();

  // Step 2: Select tools
  const toolAnswers = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedTools",
      message: "Which tools should agent-bell notify for?",
      choices: tools.map((t) => ({
        name: t.label,
        value: t.name,
        checked: t.detected,
      })),
    },
  ]);
  const selectedTools = toolAnswers.selectedTools as ToolName[];

  if (selectedTools.length === 0) {
    log.warn("No tools selected. Run `agent-bell init` again when ready.");
    return;
  }

  // Step 3: Event preset
  const presetAnswers = await inquirer.prompt([
    {
      type: "list",
      name: "preset",
      message: "Event notification mode:",
      choices: [
        {
          name: "Smart auto (task complete + needs input + errors)",
          value: "auto",
        },
        { name: "Granular (choose specific events)", value: "granular" },
      ],
    },
  ]);
  const preset = presetAnswers.preset as "auto" | "granular";

  let eventConfig: Record<BellEvent, boolean> = {
    "task-complete": true,
    "needs-input": true,
    error: true,
    "session-start": false,
    "tool-use": false,
  };

  if (preset === "granular") {
    const eventAnswers = await inquirer.prompt([
      {
        type: "checkbox",
        name: "events",
        message: "Select events to notify on:",
        choices: [
          { name: "Task complete", value: "task-complete", checked: true },
          { name: "Needs input", value: "needs-input", checked: true },
          { name: "Error", value: "error", checked: true },
          { name: "Session start", value: "session-start", checked: false },
          { name: "Tool use", value: "tool-use", checked: false },
        ],
      },
    ]);
    const events = eventAnswers.events as BellEvent[];

    eventConfig = {
      "task-complete": events.includes("task-complete"),
      "needs-input": events.includes("needs-input"),
      error: events.includes("error"),
      "session-start": events.includes("session-start"),
      "tool-use": events.includes("tool-use"),
    };
  }

  // Step 4: Notification methods
  const notifAnswers = await inquirer.prompt([
    {
      type: "checkbox",
      name: "methods",
      message: "Notification methods:",
      choices: [
        { name: "Sound — play themed audio", value: "sound", checked: true },
        { name: "Desktop — macOS/Linux banner notification (clickable)", value: "desktop", checked: true },
        { name: "Terminal bell — triggers terminal's built-in bell", value: "terminal_bell", checked: true },
        { name: "Say — text-to-speech announcement", value: "say", checked: false },
        { name: "Tmux — tmux status line alert", value: "tmux", checked: false },
      ],
    },
  ]);
  const selectedMethods = notifAnswers.methods as string[];

  const notificationConfig = {
    sound: selectedMethods.includes("sound"),
    desktop: selectedMethods.includes("desktop"),
    terminal_bell: selectedMethods.includes("terminal_bell"),
    say: selectedMethods.includes("say"),
    tmux: selectedMethods.includes("tmux"),
  };

  // If desktop selected, send test notification and show guidance
  if (notificationConfig.desktop) {
    desktop.send({ event: "task-complete", source: undefined, escalated: false });
    console.log();
    log.success("Test desktop notification sent!");
    log.info("If you don't see it, allow notifications for terminal-notifier in:");
    log.info("  System Settings → Notifications → terminal-notifier");
    console.log();

    // Accessibility check for window-level focus (macOS only)
    if (getPlatform() === "darwin") {
      const hasAccess = checkAccessibility();
      if (hasAccess) {
        log.success("Accessibility permission granted — window-level focus is active.");
        log.dim("Clicking a notification will raise the correct window, even with multiple open.");
        console.log();
      } else {
        log.warn("Accessibility permission not granted.");
        log.dim("Without it, clicking a notification activates the app but can't target a specific window.");
        log.dim("This matters when you have multiple windows open (e.g., two Cursor projects).");
        console.log();

        const { default: inquirer } = await import("inquirer");
        const { openSettings } = await inquirer.prompt([
          {
            type: "confirm",
            name: "openSettings",
            message: "Open System Settings to grant Accessibility access?",
            default: true,
          },
        ]);

        if (openSettings) {
          openAccessibilitySettings();
          log.info("System Settings opened. Add your terminal app to the Accessibility list.");
          log.dim("  System Settings → Privacy & Security → Accessibility");
          console.log();

          const { recheck } = await inquirer.prompt([
            {
              type: "confirm",
              name: "recheck",
              message: "Done granting access? Re-check now?",
              default: true,
            },
          ]);

          if (recheck) {
            if (checkAccessibility()) {
              log.success("Accessibility permission granted — window-level focus is active!");
            } else {
              log.warn("Still not detected. You may need to restart your terminal after granting access.");
              log.dim("You can check later with `agent-bell status`.");
            }
            console.log();
          }
        } else {
          log.dim("Skipped. You can grant Accessibility access later.");
          log.dim("Check with `agent-bell status` at any time.");
          console.log();
        }
      }
    }
  }

  // Step 5: Theme selection
  const availableThemes = listThemes();
  const themeChoices = availableThemes.length > 0
    ? availableThemes.map((t) => ({
        name: `${t.name} ${t.manifest?.description ? `\u2014 ${t.manifest.description}` : ""} (${t.source})`,
        value: t.name,
      }))
    : [{ name: "galactic (default)", value: "galactic" }];

  const themeAnswers = await inquirer.prompt([
    {
      type: "list",
      name: "theme",
      message: "Select a sound theme:",
      choices: themeChoices,
    },
  ]);
  const theme = themeAnswers.theme as string;

  // Step 6: Preview
  const previewAnswers = await inquirer.prompt([
    {
      type: "confirm",
      name: "wantPreview",
      message: "Preview theme sounds?",
      default: true,
    },
  ]);

  if (previewAnswers.wantPreview) {
    const previewEvent: BellEvent = "task-complete";
    const soundFile = resolveSoundFile(theme, previewEvent, false);
    if (soundFile) {
      log.info(`Playing "${previewEvent}" from "${theme}"...`);
      playSound(soundFile, 0.7);
      await new Promise((r) => setTimeout(r, 2000));
    } else {
      log.dim("No preview available (theme files not yet installed).");
    }
  }

  // Step 7: Volume
  const volumeAnswers = await inquirer.prompt([
    {
      type: "number",
      name: "volume",
      message: "Volume (0.0 - 1.0):",
      default: 0.7,
    },
  ]);
  const volume = Math.max(0, Math.min(1, volumeAnswers.volume as number || 0.7));

  // Step 8: Build config and install
  const config: AgentBellConfig = {
    theme,
    cooldown: 3,
    escalation_delay: 30,
    volume,
    tools: {
      claude: {
        enabled: selectedTools.includes("claude"),
        events: preset,
      },
      cursor: {
        enabled: selectedTools.includes("cursor"),
        events: preset,
      },
      gemini: {
        enabled: selectedTools.includes("gemini"),
        events: preset,
      },
    },
    events: eventConfig,
    notifications: notificationConfig,
  };

  saveConfig(config);
  log.success("Config saved to ~/.agent-bell/config.json");

  // Install hooks
  const backups: string[] = [];

  if (config.tools.claude.enabled) {
    const result = installClaudeHooks();
    log.success("Installed Claude Code hooks");
    if (result.backupPath) backups.push(result.backupPath);
  }

  if (config.tools.cursor.enabled) {
    const result = installCursorHooks();
    log.success("Installed Cursor hooks");
    if (result.backupPath) backups.push(result.backupPath);
  }

  if (config.tools.gemini.enabled) {
    const result = installGeminiHooks();
    log.success("Installed Gemini CLI hooks");
    if (result.backupPath) backups.push(result.backupPath);
  }

  // Summary
  console.log("\n  Setup complete!\n");
  log.info(`Theme: ${theme}`);
  log.info(`Tools: ${selectedTools.join(", ")}`);
  log.info(`Notifications: ${selectedMethods.join(", ")}`);
  log.info(`Volume: ${volume}`);

  if (backups.length > 0) {
    console.log();
    log.dim("Backups created:");
    for (const b of backups) {
      log.dim(`  ${b}`);
    }
  }

  console.log();
  log.info("Run `agent-bell status` to verify your setup.");
  log.info("Run `agent-bell uninstall` to remove all hooks.\n");
}
