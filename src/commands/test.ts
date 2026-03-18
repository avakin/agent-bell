import { loadConfig } from "../core/config-manager.js";
import { notify } from "../core/notifiers/index.js";
import { isPaused } from "../core/state-manager.js";
import { log } from "../utils/logger.js";

export function testCommand(): void {
  if (isPaused()) {
    log.warn("Notifications are paused — firing test anyway");
  }

  const config = loadConfig();
  const methods = config.notifications;

  const enabled: string[] = [];
  if (methods.sound) enabled.push("sound");
  if (methods.desktop) enabled.push("desktop");
  if (methods.terminal_bell) enabled.push("terminal bell");
  if (methods.say) enabled.push("say");
  if (methods.tmux) enabled.push("tmux");

  if (enabled.length === 0) {
    log.warn("No notification methods enabled. Check 'agent-bell config show'.");
    return;
  }

  log.info(`Firing test notification via: ${enabled.join(", ")}`);
  notify(config, "task-complete", undefined, false);
  log.success("Test notification sent!");
  log.dim("If nothing happened, run 'agent-bell doctor'");
}
