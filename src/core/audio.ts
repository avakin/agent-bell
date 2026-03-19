import { existsSync } from "node:fs";
import { getAudioPlayer } from "../utils/platform.js";
import { spawnWithTimeout } from "../utils/spawn.js";
import { logToFile } from "../utils/logger.js";

export function playSound(filePath: string, volume = 0.7): void {
  if (!existsSync(filePath)) return;

  try {
    const player = getAudioPlayer();
    const args = [...player.volumeArgs(volume), filePath];
    spawnWithTimeout(player.command, args);
  } catch (error) {
    logToFile(`Failed to play sound: ${filePath}`, error);
  }
}
