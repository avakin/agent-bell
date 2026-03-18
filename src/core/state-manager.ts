import { existsSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { getConfigDir, ensureConfigDir } from "./config-manager.js";
import type { PlayState } from "../types/index.js";
import { logToFile } from "../utils/logger.js";

const STATE_FILE = join(getConfigDir(), "state.json");
const PAUSED_FILE = join(getConfigDir(), ".paused");

export function isPaused(): boolean {
  return existsSync(PAUSED_FILE);
}

export function setPaused(paused: boolean): void {
  ensureConfigDir();
  if (paused) {
    writeFileSync(PAUSED_FILE, new Date().toISOString(), "utf-8");
  } else {
    try {
      unlinkSync(PAUSED_FILE);
    } catch {
      // Already removed
    }
  }
}

function loadState(): PlayState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as PlayState;
    }
  } catch (err) {
    logToFile("Failed to parse state file, resetting", err);
  }
  return { lastPlayed: {}, escalationTracking: {} };
}

function saveState(state: PlayState): void {
  ensureConfigDir();
  writeFileSync(STATE_FILE, JSON.stringify(state), "utf-8");
}

export function shouldPlay(event: string, cooldownSec: number): boolean {
  const state = loadState();
  const last = state.lastPlayed[event];
  if (!last) return true;
  return Date.now() - last >= cooldownSec * 1000;
}

export function shouldEscalate(event: string, escalationDelaySec: number): boolean {
  const state = loadState();
  const firstFired = state.escalationTracking[event];
  if (!firstFired) return false;
  return Date.now() - firstFired > escalationDelaySec * 1000;
}

export function recordPlay(event: string): void {
  const state = loadState();
  const now = Date.now();
  state.lastPlayed[event] = now;

  // Start escalation tracking if not already set
  if (!state.escalationTracking[event]) {
    state.escalationTracking[event] = now;
  }

  saveState(state);
}

export function clearEscalation(event: string): void {
  const state = loadState();
  delete state.escalationTracking[event];
  saveState(state);
}
