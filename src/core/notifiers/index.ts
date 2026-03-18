import type { AgentBellConfig, BellEvent } from "../../types/index.js";
import type { NotificationPayload } from "./types.js";
import { sendSound } from "./sound.js";
import * as desktop from "./desktop.js";
import * as terminalBell from "./terminal-bell.js";
import * as say from "./say.js";
import * as tmux from "./tmux.js";

export function notify(
  config: AgentBellConfig,
  event: BellEvent,
  source: string | undefined,
  escalated: boolean,
): void {
  const payload: NotificationPayload = { event, source, escalated };
  const methods = config.notifications;

  if (methods.sound) {
    sendSound(config, payload);
  }

  if (methods.desktop) {
    desktop.send(payload);
  }

  if (methods.terminal_bell) {
    terminalBell.send();
  }

  if (methods.say) {
    say.send(payload);
  }

  if (methods.tmux) {
    tmux.send(payload);
  }
}
