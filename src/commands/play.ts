import type { BellEvent } from "../types/index.js";
import { loadConfig } from "../core/config-manager.js";
import { acquireLock, releaseLock } from "../core/lock.js";
import { shouldPlay, shouldEscalate, recordPlay, clearEscalation, isPaused } from "../core/state-manager.js";
import { notify } from "../core/notifiers/index.js";
import { logToFile } from "../utils/logger.js";

const VALID_EVENTS = new Set<string>([
  "task-complete",
  "needs-input",
  "error",
  "session-start",
  "tool-use",
]);

/**
 * The hot-path command invoked by hooks.
 * Must be fast (<50ms), never throw, never produce stderr, always exit 0.
 */
export function playCommand(event: string, source?: string): void {
  try {
    if (!VALID_EVENTS.has(event)) return;
    if (isPaused()) return;

    const bellEvent = event as BellEvent;
    const config = loadConfig();

    // Check if event is enabled
    if (!config.events[bellEvent]) return;

    // Acquire lock (skip if another instance is playing)
    if (!acquireLock()) return;

    // Use composite key for per-source cooldown/escalation tracking
    const stateKey = source ? `${source}:${bellEvent}` : bellEvent;

    try {
      // Cooldown check
      if (!shouldPlay(stateKey, config.cooldown)) return;

      // Escalation check
      const escalated = shouldEscalate(stateKey, config.escalation_delay);

      // Fire all enabled notification methods
      notify(config, bellEvent, source, escalated);

      // Record play
      recordPlay(stateKey);

      // Clear escalation after escalated play
      if (escalated) {
        clearEscalation(stateKey);
      }
    } finally {
      releaseLock();
    }
  } catch (error) {
    logToFile("Unhandled error in play command", error);
  }
}
