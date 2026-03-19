import { existsSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { getConfigDir, ensureConfigDir } from "./config-manager.js";
import type { PlayState } from "../types/index.js";
import { logToFile } from "../utils/logger.js";

const STATE_FILE = path.join(getConfigDir(), "state.json");
const PAUSED_FILE = path.join(getConfigDir(), ".paused");

export function isPaused(): boolean {
  return existsSync(PAUSED_FILE);
}

export function setPaused(paused: boolean): void {
  ensureConfigDir();
  if (paused) {
    writeFileSync(PAUSED_FILE, new Date().toISOString(), "utf8");
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
      return JSON.parse(readFileSync(STATE_FILE, "utf8")) as PlayState;
    }
  } catch (error) {
    logToFile("Failed to parse state file, resetting", error);
  }
  return { lastPlayed: {}, escalationTracking: {} };
}

function saveState(state: PlayState): void {
  ensureConfigDir();
  writeFileSync(STATE_FILE, JSON.stringify(state), "utf8");
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
  const { [event]: _, ...rest } = state.escalationTracking;
  state.escalationTracking = rest;
  saveState(state);
}
