import { openSync, closeSync, unlinkSync, statSync, constants } from "node:fs";
import path from "node:path";
import { getConfigDir, ensureConfigDir } from "./config-manager.js";
import { logToFile } from "../utils/logger.js";

const LOCK_FILE = path.join(getConfigDir(), ".lock");
const STALE_THRESHOLD_MS = 10_000;

export function acquireLock(): boolean {
  ensureConfigDir();

  // Check for stale lock
  try {
    const stat = statSync(LOCK_FILE);
    const age = Date.now() - stat.mtimeMs;
    if (age > STALE_THRESHOLD_MS) {
      try { unlinkSync(LOCK_FILE); } catch (error) { logToFile("Failed to remove stale lock", error); }
    }
  } catch {
    // No lock file exists — proceed
  }

  try {
    const fd = openSync(LOCK_FILE, constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY);
    closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

export function releaseLock(): void {
  try {
    unlinkSync(LOCK_FILE);
  } catch {
    // Already removed — ok
  }
}
