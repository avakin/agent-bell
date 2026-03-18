import type { AgentBellConfig } from "../../types/index.js";
import type { NotificationPayload } from "./types.js";
import { resolveSoundFile } from "../theme-manager.js";
import { playSound } from "../audio.js";

export function sendSound(config: AgentBellConfig, payload: NotificationPayload): void {
  const soundFile = resolveSoundFile(config.theme, payload.event, payload.escalated);
  if (!soundFile) return;

  const volume = payload.escalated
    ? Math.min(config.volume * 1.5, 1.0)
    : config.volume;
  playSound(soundFile, volume);
}
