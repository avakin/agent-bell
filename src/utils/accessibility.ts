import { execFileSync } from "child_process";
import { getPlatform } from "./platform.js";

/**
 * Check if Accessibility permission is granted on macOS.
 * Runs a quick System Events query — succeeds only with Accessibility access.
 */
export function checkAccessibility(): boolean {
  if (getPlatform() !== "darwin") return false;

  try {
    execFileSync("osascript", [
      "-e",
      'tell application "System Events" to get name of first process',
    ], { stdio: "pipe", timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Open macOS System Settings to the Accessibility privacy pane.
 */
export function openAccessibilitySettings(): void {
  try {
    execFileSync("open", [
      "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility",
    ], { stdio: "ignore" });
  } catch {
    // Ignore — best effort
  }
}
