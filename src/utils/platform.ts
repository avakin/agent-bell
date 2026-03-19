import { platform } from "node:os";
import { execFileSync } from "node:child_process";

export type SupportedPlatform = "darwin" | "linux";

export function getPlatform(): SupportedPlatform {
  const p = platform();
  if (p === "darwin" || p === "linux") return p;
  throw new Error(`Unsupported platform: ${p}. agent-bell supports macOS and Linux.`);
}

export function getAudioPlayer(): { command: string; volumeArgs: (vol: number) => string[] } {
  const p = getPlatform();

  if (p === "darwin") {
    return {
      command: "afplay",
      volumeArgs: (vol: number) => ["-v", String(vol)],
    };
  }

  // Linux: try paplay first, fall back to aplay
  try {
    execFileSync("which", ["paplay"], { stdio: "ignore" });
    return {
      command: "paplay",
      volumeArgs: (vol: number) => [`--volume=${Math.round(vol * 65_536)}`],
    };
  } catch {
    return {
      command: "aplay",
      volumeArgs: () => [], // aplay doesn't support volume control
    };
  }
}
