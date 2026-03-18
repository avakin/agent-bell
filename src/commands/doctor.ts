import { existsSync, readFileSync } from "fs";
import { join } from "path";
import chalk from "chalk";
import { loadConfig, getConfigDir, getConfigPath } from "../core/config-manager.js";
import { getAudioPlayer } from "../utils/platform.js";
import { loadThemeManifest, getThemeDir, resolveSoundFile } from "../core/theme-manager.js";
import { getClaudeHookStatus } from "../hooks/claude.js";
import { getCursorHookStatus } from "../hooks/cursor.js";
import { getGeminiHookStatus } from "../hooks/gemini.js";
import { isPaused } from "../core/state-manager.js";
import type { BellEvent } from "../types/index.js";

function pass(msg: string): void {
  console.log(`  ${chalk.green("✔")} ${msg}`);
}

function fail(msg: string): void {
  console.log(`  ${chalk.red("✖")} ${msg}`);
}

function warn(msg: string): void {
  console.log(`  ${chalk.yellow("⚠")} ${msg}`);
}

export function doctorCommand(): void {
  console.log(chalk.bold("\n  agent-bell doctor\n"));

  let passed = 0;
  let issues = 0;

  // 1. Node.js version
  const nodeVersion = parseInt(process.versions.node.split(".")[0], 10);
  if (nodeVersion >= 18) {
    pass(`Node.js ${process.versions.node}`);
    passed++;
  } else {
    fail(`Node.js ${process.versions.node} — requires >= 18`);
    issues++;
  }

  // 2. Audio player
  try {
    const player = getAudioPlayer();
    pass(`Audio player: ${player.command}`);
    passed++;
  } catch {
    fail("No audio player found (afplay, paplay, or aplay)");
    issues++;
  }

  // 3. Config file
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    try {
      JSON.parse(readFileSync(configPath, "utf-8"));
      pass("Config file valid");
      passed++;
    } catch {
      fail("Config file exists but is not valid JSON");
      issues++;
    }
  } else {
    warn("No config file — using defaults");
    passed++;
  }

  const config = loadConfig();

  // 4. Theme directory
  const themeDir = getThemeDir(config.theme);
  if (themeDir) {
    pass(`Theme directory: ${config.theme}`);
    passed++;
  } else {
    fail(`Theme '${config.theme}' not found`);
    issues++;
  }

  // 5. Sound files for enabled events
  const enabledEvents = Object.entries(config.events)
    .filter(([, enabled]) => enabled)
    .map(([event]) => event as BellEvent);

  if (config.notifications.sound) {
    const manifest = loadThemeManifest(config.theme);
    if (manifest) {
      let allFound = true;
      for (const event of enabledEvents) {
        const soundFile = resolveSoundFile(config.theme, event, false);
        if (!soundFile) {
          fail(`Missing sound file for event: ${event}`);
          issues++;
          allFound = false;
        }
      }
      if (allFound) {
        pass(`Sound files present for all ${enabledEvents.length} enabled events`);
        passed++;
      }
    } else {
      fail("Cannot load theme manifest");
      issues++;
    }
  } else {
    pass("Sound notifications disabled — skipping sound file check");
    passed++;
  }

  // 6. Hooks installed for enabled tools
  const toolChecks = [
    { name: "Claude Code", enabled: config.tools.claude.enabled, status: getClaudeHookStatus() },
    { name: "Cursor", enabled: config.tools.cursor.enabled, status: getCursorHookStatus() },
    { name: "Gemini CLI", enabled: config.tools.gemini.enabled, status: getGeminiHookStatus() },
  ];

  for (const tool of toolChecks) {
    if (tool.enabled) {
      if (tool.status.installed) {
        pass(`${tool.name} hooks installed`);
        passed++;
      } else {
        fail(`${tool.name} enabled but hooks not installed — run 'agent-bell init'`);
        issues++;
      }
    }
  }

  // 7. Paused state
  if (isPaused()) {
    warn("Notifications are currently paused — run 'agent-bell resume'");
    issues++;
  }

  // 8. Recent errors
  const errorLog = join(getConfigDir(), "error.log");
  if (existsSync(errorLog)) {
    const content = readFileSync(errorLog, "utf-8").trim();
    if (content) {
      const lines = content.split("\n");
      const last5 = lines.slice(-5);
      warn("Recent errors in error.log:");
      for (const line of last5) {
        console.log(chalk.dim(`    ${line}`));
      }
      issues++;
    }
  }

  // Summary
  console.log();
  console.log(`  ${chalk.bold(`${passed} passed`)}, ${issues > 0 ? chalk.yellow(`${issues} issues found`) : chalk.green("0 issues found")}`);
  console.log();
}
