import { spawn, type ChildProcess, type SpawnOptions } from "child_process";
import { logToFile } from "./logger.js";

export function spawnWithTimeout(
  command: string,
  args: string[],
  options?: SpawnOptions,
  timeoutMs = 10_000,
): ChildProcess {
  const child = spawn(command, args, {
    detached: true,
    stdio: "ignore",
    ...options,
  });

  const timer = setTimeout(() => {
    try {
      child.kill();
    } catch {
      // Process may have already exited
    }
  }, timeoutMs);
  timer.unref();

  child.on("error", (err) => {
    logToFile(`Spawn failed: ${command} ${args.join(" ")}`, err);
  });

  child.unref();
  return child;
}
