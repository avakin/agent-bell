import { spawn } from "child_process";
import type { NotificationPayload } from "./types.js";
import { SOURCE_LABELS, EVENT_LABELS } from "./types.js";

export function isAvailable(): boolean {
  return !!process.env.TMUX;
}

export function send(payload: NotificationPayload): void {
  if (!isAvailable()) return;

  const source = payload.source
    ? SOURCE_LABELS[payload.source] ?? payload.source
    : "Agent Bell";
  const event = EVENT_LABELS[payload.event] ?? payload.event;
  const message = `${source}: ${event}`;

  try {
    const child = spawn("tmux", ["display-message", message], {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Never throw
  }
}
