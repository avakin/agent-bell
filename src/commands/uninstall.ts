import { existsSync, rmSync } from "fs";
import { log } from "../utils/logger.js";
import { getConfigDir } from "../core/config-manager.js";
import { uninstallClaudeHooks } from "../hooks/claude.js";
import { uninstallCursorHooks } from "../hooks/cursor.js";
import { uninstallGeminiHooks } from "../hooks/gemini.js";

export async function uninstallCommand(options: { removeConfig?: boolean }): Promise<void> {
  log.info("Removing agent-bell hooks...\n");

  uninstallClaudeHooks();
  log.success("Removed Claude Code hooks");

  uninstallCursorHooks();
  log.success("Removed Cursor hooks");

  uninstallGeminiHooks();
  log.success("Removed Gemini CLI hooks");

  if (options.removeConfig) {
    const configDir = getConfigDir();
    if (existsSync(configDir)) {
      rmSync(configDir, { recursive: true, force: true });
      log.success("Removed ~/.agent-bell/ directory");
    }
  }

  console.log();
  log.success("agent-bell has been uninstalled.");
  if (!options.removeConfig) {
    log.dim("Config preserved at ~/.agent-bell/. Use --remove-config to delete it.");
  }
  console.log();
}
