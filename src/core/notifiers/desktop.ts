import { writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";
import type { NotificationPayload } from "./types.js";
import { SOURCE_LABELS, EVENT_LABELS } from "./types.js";
import { spawnWithTimeout } from "../../utils/spawn.js";
import { logToFile } from "../../utils/logger.js";

const NOTIFIER_PATH = path.join(
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

const TERMINAL_EMULATOR_BUNDLE_IDS = new Set([
  "com.apple.Terminal",
  "com.googlecode.iterm2",
  "net.kovidgoyal.kitty",
  "com.mitchellh.ghostty",
  "dev.warp.Warp-Stable",
  "co.zeit.hyper",
  "io.wezfurlong.wezterm",
  "org.alacritty",
]);

function escapeShellArg(s: string): string {
  return s.replaceAll('\'', String.raw`'\''`);
}

function escapeAppleScriptString(s: string): string {
  return s.replaceAll('\\', "\\\\").replaceAll('"', String.raw`\"`);
}

export function send(payload: NotificationPayload): void {
  const title = payload.source
    ? SOURCE_LABELS[payload.source] ?? payload.source
    : "Agent Bell";
  const body = EVENT_LABELS[payload.event] ?? payload.event;

  try {
    const bundleId = getBundleId();

    if (bundleId) {
      const project = path.basename(process.cwd());
      const projectPath = process.cwd();

      // Write the activate AppleScript to a temp file to avoid shell quoting issues
      const scriptPath = path.join(tmpdir(), `agent-bell-${randomBytes(4).toString("hex")}.applescript`);
      // Phase 1: open -b triggers macOS Space switch
      // For terminal emulators, omit path to avoid opening a new window
      // For IDEs, include path to focus the correct project window
      // Phase 2: AXRaise ensures the correct window is frontmost within that Space
      const isTerminalEmulator = TERMINAL_EMULATOR_BUNDLE_IDS.has(bundleId);
      const openCmd = isTerminalEmulator
        ? `open -b '${escapeShellArg(bundleId)}'`
        : `open -b '${escapeShellArg(bundleId)}' '${escapeShellArg(projectPath)}'`;
      const activateScript = [
        "try",
        `  do shell script "${escapeAppleScriptString(openCmd)}"`,
        "  delay 0.3",
        "end try",
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
  } catch (error) {
    logToFile("Failed to send desktop notification", error);
  }
}
