import { log } from "../utils/logger.js";
import { listThemes, resolveSoundFile, installTheme, loadThemeManifest } from "../core/theme-manager.js";
import { playSound } from "../core/audio.js";
import { loadConfig } from "../core/config-manager.js";
import { existsSync } from "fs";
import type { BellEvent } from "../types/index.js";

export function themesListCommand(): void {
  const themes = listThemes();
  const config = loadConfig();

  if (themes.length === 0) {
    log.dim("No themes installed.");
    log.info("Run `agent-bell init` to set up themes.");
    return;
  }

  console.log("\nAvailable themes:\n");
  for (const theme of themes) {
    const active = theme.name === config.theme ? " (active)" : "";
    const desc = theme.manifest?.description ?? "";
    console.log(`  ${theme.name}${active}  ${desc}  [${theme.source}]`);
  }
  console.log();
}

export async function themesPreviewCommand(themeName: string): Promise<void> {
  const manifest = loadThemeManifest(themeName);
  if (!manifest) {
    log.error(`Theme "${themeName}" not found.`);
    return;
  }

  console.log(`\nPreviewing theme: ${themeName}`);
  if (manifest.description) console.log(`  ${manifest.description}\n`);

  const events: BellEvent[] = ["task-complete", "needs-input", "error"];
  const config = loadConfig();

  for (const event of events) {
    const soundFile = resolveSoundFile(themeName, event, false);
    if (soundFile) {
      log.info(`Playing: ${event}`);
      playSound(soundFile, config.volume);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

export function themesAddCommand(sourcePath: string): void {
  if (!existsSync(sourcePath)) {
    log.error(`Path not found: ${sourcePath}`);
    return;
  }

  // Derive theme name from directory name
  const themeName = sourcePath.split("/").pop()!;

  installTheme(sourcePath, themeName);
  log.success(`Theme "${themeName}" installed.`);
  log.info(`Set it with: agent-bell config set theme ${themeName}`);
}
