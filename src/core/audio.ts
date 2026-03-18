import { existsSync } from "fs";
import { getAudioPlayer } from "../utils/platform.js";
import { spawnWithTimeout } from "../utils/spawn.js";
import { logToFile } from "../utils/logger.js";

export function playSound(filePath: string, volume: number = 0.7): void {
  if (!existsSync(filePath)) return;

  try {
    const player = getAudioPlayer();
    const args = [...player.volumeArgs(volume), filePath];
    spawnWithTimeout(player.command, args);
  } catch (err) {
    logToFile(`Failed to play sound: ${filePath}`, err);
  }
}
