import { existsSync, readFileSync, writeFileSync, readdirSync, unlinkSync, renameSync } from "fs";
import { dirname, join, basename } from "path";
import { randomBytes } from "crypto";

const MAX_BACKUPS = 3;

export function readJsonFile<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf-8")) as T;
  } catch {
    return null;
  }
}

export function createBackup(filePath: string): string | null {
  if (!existsSync(filePath)) return null;

  const dir = dirname(filePath);
  const base = basename(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = join(dir, `${base}.agent-bell-backup.${timestamp}`);

  const content = readFileSync(filePath, "utf-8");
  writeFileSync(backupPath, content, "utf-8");

  // Clean up old backups, keep only MAX_BACKUPS
  pruneBackups(dir, base);

  return backupPath;
}

function pruneBackups(dir: string, baseFilename: string): void {
  const prefix = `${baseFilename}.agent-bell-backup.`;
  try {
    const backups = readdirSync(dir)
      .filter((f) => f.startsWith(prefix))
      .sort()
      .reverse();

    for (const old of backups.slice(MAX_BACKUPS)) {
      try {
        unlinkSync(join(dir, old));
      } catch {
        // ignore
      }
    }
  } catch {
    // ignore
  }
}

export function atomicWriteJson(filePath: string, data: unknown): void {
  const dir = dirname(filePath);
  const tmpFile = join(dir, `.tmp-${randomBytes(6).toString("hex")}`);
  const content = JSON.stringify(data, null, 2) + "\n";

  writeFileSync(tmpFile, content, "utf-8");
  renameSync(tmpFile, filePath);

  // Validate: re-read and parse
  try {
    JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    // Corrupt — try to restore backup
    const backups = readdirSync(dir)
      .filter((f) => f.includes(".agent-bell-backup."))
      .sort()
      .reverse();

    if (backups.length > 0) {
      const backupContent = readFileSync(join(dir, backups[0]), "utf-8");
      writeFileSync(filePath, backupContent, "utf-8");
      throw new Error("Written file was corrupt — restored from backup");
    }
    throw new Error("Written file was corrupt and no backup available");
  }
}

export function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      targetVal &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal)
    ) {
      (result as Record<string, unknown>)[key as string] = deepMerge(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>
      );
    } else {
      (result as Record<string, unknown>)[key as string] = sourceVal;
    }
  }
  return result;
}
