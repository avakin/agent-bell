import { platform } from "os";
import type { NotificationPayload } from "./types.js";
import { SOURCE_LABELS, EVENT_LABELS } from "./types.js";
import { spawnWithTimeout } from "../../utils/spawn.js";
import { logToFile } from "../../utils/logger.js";

export function isAvailable(): boolean {
  return platform() === "darwin";
}

export function send(payload: NotificationPayload): void {
  if (!isAvailable()) return;

  const source = payload.source
    ? SOURCE_LABELS[payload.source] ?? payload.source
    : "Agent Bell";
  const event = EVENT_LABELS[payload.event] ?? payload.event;
  const message = `${source}: ${event}`;

  try {
    spawnWithTimeout("say", [message]);
  } catch (err) {
    logToFile("Failed to send say notification", err);
  }
}
