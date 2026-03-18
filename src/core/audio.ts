import { spawn } from "child_process";
import { existsSync } from "fs";
import { getAudioPlayer } from "../utils/platform.js";

export function playSound(filePath: string, volume: number = 0.7): void {
  if (!existsSync(filePath)) return;

  try {
    const player = getAudioPlayer();
    const args = [...player.volumeArgs(volume), filePath];
    const child = spawn(player.command, args, {
      detached: true,
      stdio: "ignore",
    });
    child.unref();
  } catch {
    // Never throw — hooks must not block the AI agent
  }
}
