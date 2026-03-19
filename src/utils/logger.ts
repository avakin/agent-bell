import chalk from "chalk";
import { appendFileSync, existsSync, statSync, renameSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const LOG_DIR = path.join(homedir(), ".agent-bell");
const LOG_FILE = path.join(LOG_DIR, "error.log");
const MAX_LOG_SIZE = 1_048_576; // 1MB

export function logToFile(message: string, error?: unknown): void {
  try {
    if (!existsSync(LOG_DIR)) {
      mkdirSync(LOG_DIR, { recursive: true });
    }

    // Simple rotation: if > 1MB, rename to .1
    if (existsSync(LOG_FILE)) {
      const size = statSync(LOG_FILE).size;
      if (size > MAX_LOG_SIZE) {
        renameSync(LOG_FILE, LOG_FILE + ".1");
      }
    }

    let line = `[${new Date().toISOString()}] ${message}\n`;
    if (error instanceof Error) {
      line += `  ${error.message}\n`;
      if (error.stack) {
        line += `  ${error.stack}\n`;
      }
    } else if (error !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string -- unknown error, best-effort stringification
      line += `  ${String(error)}\n`;
    }

    appendFileSync(LOG_FILE, line);
  } catch {
    // Logging must never throw
  }
}

export const log = {
  info: (msg: string) => { console.log(chalk.blue("ℹ"), msg); },
  success: (msg: string) => { console.log(chalk.green("✔"), msg); },
  warn: (msg: string) => { console.log(chalk.yellow("⚠"), msg); },
  error: (msg: string) => { console.error(chalk.red("✖"), msg); },
  dim: (msg: string) => { console.log(chalk.dim(msg)); },
  banner: () => {
    console.log(chalk.bold.cyan("\n  🔔 agent-bell\n"));
  },
};
