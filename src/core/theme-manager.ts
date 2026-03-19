import { existsSync, readFileSync, readdirSync, mkdirSync, cpSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";
import type { BellEvent, ThemeManifest } from "../types/index.js";
import { logToFile } from "../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getUserThemesDir(): string {
  return path.join(homedir(), ".agent-bell", "themes");
}

function getBundledThemesDir(): string {
  // From dist/core/theme-manager.js → ../../assets/themes
  return path.join(__dirname, "..", "..", "assets", "themes");
}

export function getThemeDir(themeName: string): string | null {
  // Check user themes first
  const userDir = path.join(getUserThemesDir(), themeName);
  if (existsSync(userDir)) return userDir;

  // Then bundled themes
  const bundledDir = path.join(getBundledThemesDir(), themeName);
  if (existsSync(bundledDir)) return bundledDir;

  return null;
}

export function loadThemeManifest(themeName: string): ThemeManifest | null {
  const dir = getThemeDir(themeName);
  if (!dir) return null;

  const manifestPath = path.join(dir, "theme.json");
  if (!existsSync(manifestPath)) return null;

  try {
    return JSON.parse(readFileSync(manifestPath, "utf8")) as ThemeManifest;
  } catch (error) {
    logToFile("Failed to parse theme manifest", error);
    return null;
  }
}

export function resolveSoundFile(
  themeName: string,
  event: BellEvent,
  escalated: boolean
): string | null {
  const dir = getThemeDir(themeName);
  if (!dir) return null;

  const manifest = loadThemeManifest(themeName);
  if (!manifest) return null;

  // Try escalated variant first
  if (escalated) {
    const escalatedKey = `${event}-escalated` as keyof ThemeManifest["sounds"];
    const escalatedFile = manifest.sounds[escalatedKey];
    if (escalatedFile) {
      const fullPath = path.join(dir, escalatedFile);
      if (existsSync(fullPath)) return fullPath;
    }
  }

  // Fall back to normal variant
  const normalFile = manifest.sounds[event];
  if (normalFile) {
    const fullPath = path.join(dir, normalFile);
    if (existsSync(fullPath)) return fullPath;
  }

  return null;
}

export function listThemes(): { name: string; manifest: ThemeManifest | null; source: "bundled" | "user" }[] {
  const themes: { name: string; manifest: ThemeManifest | null; source: "bundled" | "user" }[] = [];
  const seen = new Set<string>();

  // User themes first (higher priority)
  const userDir = getUserThemesDir();
  if (existsSync(userDir)) {
    for (const entry of readdirSync(userDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        seen.add(entry.name);
        themes.push({
          name: entry.name,
          manifest: loadThemeManifest(entry.name),
          source: "user",
        });
      }
    }
  }

  // Bundled themes
  const bundledDir = getBundledThemesDir();
  if (existsSync(bundledDir)) {
    for (const entry of readdirSync(bundledDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !seen.has(entry.name)) {
        themes.push({
          name: entry.name,
          manifest: loadThemeManifest(entry.name),
          source: "bundled",
        });
      }
    }
  }

  return themes;
}

export function installTheme(sourcePath: string, themeName: string): void {
  const dest = path.join(getUserThemesDir(), themeName);
  mkdirSync(dest, { recursive: true });
  cpSync(sourcePath, dest, { recursive: true });
}
