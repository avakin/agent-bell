import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createBackup } from "./common.js";

const PLUGIN_DIR = path.join(homedir(), ".config", "opencode", "plugins");
const PLUGIN_PATH = path.join(PLUGIN_DIR, "agent-bell.ts");
const MARKER = "// @agent-bell-managed";

function generatePluginContent(): string {
  return `${MARKER} — do not edit, managed by agent-bell
// https://github.com/anthropics/agent-bell
// Note: No direct task-complete mapping in OpenCode. session.idle serves as proxy.
import type { Plugin } from "@opencode-ai/plugin";

const plugin: Plugin = async ({ $ }) => {
  const bell = (event: string) =>
    $\`agent-bell play \${event} --source opencode\`.quiet().nothrow();

  return {
    event: async ({ event }) => {
      switch (event.type) {
        case "session.idle":
          await bell("needs-input");
          break;
        case "session.created":
          await bell("session-start");
          break;
        case "session.error":
          await bell("error");
          break;
      }
    },
    "tool.execute.after": async () => {
      await bell("tool-use");
    },
    "permission.ask": async () => {
      await bell("needs-input");
    },
  };
};

export default plugin;
`;
}

export function installOpenCodeHooks(): { backupPath: string | null } {
  mkdirSync(PLUGIN_DIR, { recursive: true });

  const backupPath = createBackup(PLUGIN_PATH);
  writeFileSync(PLUGIN_PATH, generatePluginContent(), "utf8");

  return { backupPath };
}

export function uninstallOpenCodeHooks(): void {
  if (!existsSync(PLUGIN_PATH)) return;

  const content = readFileSync(PLUGIN_PATH, "utf8");
  if (!content.startsWith(MARKER)) return;

  createBackup(PLUGIN_PATH);
  unlinkSync(PLUGIN_PATH);
}

export function isOpenCodeInstalled(): boolean {
  return existsSync(path.join(homedir(), ".config", "opencode"));
}

export function getOpenCodeHookStatus(): { installed: boolean; hooks: string[] } {
  if (!existsSync(PLUGIN_PATH)) return { installed: false, hooks: [] };

  const content = readFileSync(PLUGIN_PATH, "utf8");
  if (!content.startsWith(MARKER)) return { installed: false, hooks: [] };

  const hooks: string[] = [];

  // Parse event handler cases (session.idle, session.created, session.error)
  const casePattern = /case "([^"]+)":/g;
  let match;
  while ((match = casePattern.exec(content)) !== null) {
    hooks.push(match[1]);
  }

  // Parse direct hook keys (tool.execute.after, permission.ask)
  const hookPattern = /"(tool\.[^"]+|permission\.[^"]+)":\s*async/g;
  while ((match = hookPattern.exec(content)) !== null) {
    hooks.push(match[1]);
  }

  return { installed: true, hooks };
}
