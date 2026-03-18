import chalk from "chalk";
import { loadConfig, getConfigPath } from "../core/config-manager.js";
import { loadThemeManifest } from "../core/theme-manager.js";
import { getClaudeHookStatus } from "../hooks/claude.js";
import { getCursorHookStatus } from "../hooks/cursor.js";
import { getGeminiHookStatus } from "../hooks/gemini.js";
import { log } from "../utils/logger.js";
import { checkAccessibility } from "../utils/accessibility.js";
import { getPlatform } from "../utils/platform.js";

export function statusCommand(): void {
  const config = loadConfig();

  log.banner();

  // Theme
  const manifest = loadThemeManifest(config.theme);
  const themeDesc = manifest?.description ?? "unknown theme";
  console.log(`  Theme:   ${chalk.bold(config.theme)} — ${themeDesc}`);
  console.log(`  Volume:  ${config.volume}`);
  console.log(`  Cooldown: ${config.cooldown}s`);
  console.log(`  Escalation: ${config.escalation_delay}s\n`);

  // Events
  console.log("  Events:");
  for (const [event, enabled] of Object.entries(config.events)) {
    const status = enabled ? chalk.green("on") : chalk.dim("off");
    console.log(`    ${status}  ${event}`);
  }
  console.log();

  // Tools & hooks
  console.log("  Tools:");

  const hookStatuses = [
    { name: "Claude Code", config: config.tools.claude, status: getClaudeHookStatus() },
    { name: "Cursor", config: config.tools.cursor, status: getCursorHookStatus() },
    { name: "Gemini CLI", config: config.tools.gemini, status: getGeminiHookStatus() },
  ];

  for (const tool of hookStatuses) {
    const enabled = tool.config.enabled ? chalk.green("enabled") : chalk.dim("disabled");
    const hooked = tool.status.installed ? chalk.green("hooks installed") : chalk.dim("no hooks");
    console.log(`    ${tool.name}: ${enabled} — ${hooked}`);
    if (tool.status.hooks.length > 0) {
      for (const hook of tool.status.hooks) {
        console.log(chalk.dim(`      ${hook}`));
      }
    }
  }

  // Accessibility status (macOS only)
  if (getPlatform() === "darwin" && config.notifications.desktop) {
    console.log("  Accessibility:");
    const granted = checkAccessibility();
    if (granted) {
      console.log(`    ${chalk.green("granted")} — window-level focus active`);
    } else {
      console.log(`    ${chalk.yellow("not granted")} — notifications will activate app, not specific window`);
      console.log(chalk.dim("    Grant in: System Settings → Privacy & Security → Accessibility"));
    }
    console.log();
  }

  log.dim(`Config: ${getConfigPath()}`);
  console.log();
}
