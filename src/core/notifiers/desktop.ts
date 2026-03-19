import { writeFileSync } from "fs";
import { join, basename } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";
import type { NotificationPayload } from "./types.js";
import { SOURCE_LABELS, EVENT_LABELS } from "./types.js";
import { spawnWithTimeout } from "../../utils/spawn.js";
import { logToFile } from "../../utils/logger.js";

const NOTIFIER_PATH = join(
  import.meta.dirname,
  "..",
  "..",
  "..",
  "node_modules",
  "node-notifier",
  "vendor",
  "mac.noindex",
  "terminal-notifier.app",
  "Contents",
  "MacOS",
  "terminal-notifier",
);

function getBundleId(): string | undefined {
  return process.env.__CFBundleIdentifier ?? undefined;
}

function escapeShellArg(s: string): string {
  return s.replace(/'/g, "'\\''");
}

function escapeAppleScriptString(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function send(payload: NotificationPayload): void {
  const title = payload.source
    ? SOURCE_LABELS[payload.source] ?? payload.source
    : "Agent Bell";
  const body = EVENT_LABELS[payload.event] ?? payload.event;

  try {
    const bundleId = getBundleId();

    if (bundleId) {
      const project = basename(process.cwd());
      const projectPath = process.cwd();

      // Write the activate AppleScript to a temp file to avoid shell quoting issues
      const scriptPath = join(tmpdir(), `agent-bell-${randomBytes(4).toString("hex")}.applescript`);
      // Terminal-based tools (Claude Code, Gemini CLI, OpenCode) run inside a generic
      // terminal emulator. `open -b <terminal> <path>` would open a NEW terminal window
      // at that path instead of focusing the existing one. Skip Phase 1 for these tools
      // and rely solely on AXRaise to find + raise the correct window.
      const TERMINAL_SOURCES = new Set(["claude", "gemini", "opencode"]);
      const isTerminalTool = TERMINAL_SOURCES.has(payload.source ?? "");

      const openCmd = `open -b '${escapeShellArg(bundleId)}' '${escapeShellArg(projectPath)}'`;
      const activateScript = [
        // Phase 1: Space switch via open -b (skip for terminal tools — would open new window)
        ...(isTerminalTool ? [] : [
          "try",
          `  do shell script "${escapeAppleScriptString(openCmd)}"`,
          "  delay 0.3",
          "end try",
        ]),
        // Phase 2: AXRaise to target the correct window
        "try",
        '  tell application "System Events"',
        `    tell (first process whose bundle identifier is "${bundleId}")`,
        "      repeat with w in windows",
        `        if name of w contains "${project}" then`,
        '          perform action "AXRaise" of w',
        "          set frontmost to true",
        "          return",
        "        end if",
        "      end repeat",
        "      set frontmost to true",
        "    end tell",
        "  end tell",
        "on error",
        `  tell application id "${bundleId}" to activate`,
        "end try",
      ].join("\n");
      writeFileSync(scriptPath, activateScript);

      const shell = [
        `result=$('${escapeShellArg(NOTIFIER_PATH)}'`,
        ` -title '${escapeShellArg(title)}'`,
        ` -subtitle '${escapeShellArg(project)}'`,
        ` -message '${escapeShellArg(body)}'`,
        ` -timeout 30)`,
        ` && [ "$result" = "@ACTIONCLICKED" ]`,
        ` && osascript '${escapeShellArg(scriptPath)}'`,
        ` ; rm -f '${escapeShellArg(scriptPath)}'`,
      ].join("");

      spawnWithTimeout("sh", ["-c", shell], undefined, 35_000);
    } else {
      const script = `display notification ${JSON.stringify(body)} with title ${JSON.stringify(title)}`;
      spawnWithTimeout("osascript", ["-e", script], undefined, 35_000);
    }
  } catch (err) {
    logToFile("Failed to send desktop notification", err);
  }
}
