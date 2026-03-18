import { isPaused, setPaused } from "../core/state-manager.js";
import { log } from "../utils/logger.js";

export function pauseCommand(): void {
  if (isPaused()) {
    log.warn("Already paused");
    return;
  }
  setPaused(true);
  log.success("Notifications paused. Run 'agent-bell resume' to unpause.");
}

export function resumeCommand(): void {
  if (!isPaused()) {
    log.warn("Not paused");
    return;
  }
  setPaused(false);
  log.success("Notifications resumed.");
}
