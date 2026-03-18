import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { ClaudeSettings, ClaudeHookRule } from "../types/index.js";
import { readJsonFile, createBackup, atomicWriteJson } from "./common.js";

const SETTINGS_PATH = join(homedir(), ".claude", "settings.json");

function makeRule(matcher: string, command: string): ClaudeHookRule {
  return {
    matcher,
    hooks: [{ type: "command", command }],
    _agent_bell: true,
  };
}

function getAgentBellHooks(): Record<string, ClaudeHookRule[]> {
  return {
    Stop: [
      makeRule("", "agent-bell play task-complete --source claude"),
    ],
    Notification: [
      makeRule("permission_prompt", "agent-bell play needs-input --source claude"),
      makeRule("idle_prompt", "agent-bell play needs-input --source claude"),
    ],
  };
}

export function installClaudeHooks(): { backupPath: string | null } {
  const dir = join(homedir(), ".claude");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const backupPath = createBackup(SETTINGS_PATH);
  const existing = readJsonFile<ClaudeSettings>(SETTINGS_PATH) ?? {};

  // Remove existing agent-bell hooks
  const settings = removeAgentBellHooks(existing);

  // Merge in new hooks
  const newHooks = getAgentBellHooks();
  if (!settings.hooks) settings.hooks = {};

  for (const [event, rules] of Object.entries(newHooks)) {
    const existingRules = settings.hooks[event] ?? [];
    settings.hooks[event] = [...existingRules, ...rules];
  }

  atomicWriteJson(SETTINGS_PATH, settings);
  return { backupPath };
}

export function uninstallClaudeHooks(): void {
  if (!existsSync(SETTINGS_PATH)) return;

  createBackup(SETTINGS_PATH);
  const existing = readJsonFile<ClaudeSettings>(SETTINGS_PATH);
  if (!existing) return;

  const cleaned = removeAgentBellHooks(existing);
  atomicWriteJson(SETTINGS_PATH, cleaned);
}

function removeAgentBellHooks(settings: ClaudeSettings): ClaudeSettings {
  if (!settings.hooks) return settings;

  const cleaned = { ...settings };
  cleaned.hooks = {};

  for (const [event, rules] of Object.entries(settings.hooks)) {
    const filtered = rules.filter((r) => !r._agent_bell);
    if (filtered.length > 0) {
      cleaned.hooks[event] = filtered;
    }
  }

  if (Object.keys(cleaned.hooks).length === 0) {
    delete cleaned.hooks;
  }

  return cleaned;
}

export function isClaudeInstalled(): boolean {
  return existsSync(join(homedir(), ".claude"));
}

export function getClaudeHookStatus(): { installed: boolean; hooks: string[] } {
  if (!existsSync(SETTINGS_PATH)) return { installed: false, hooks: [] };

  const settings = readJsonFile<ClaudeSettings>(SETTINGS_PATH);
  if (!settings?.hooks) return { installed: false, hooks: [] };

  const bellHooks: string[] = [];
  for (const [event, rules] of Object.entries(settings.hooks)) {
    for (const rule of rules) {
      if (rule._agent_bell) {
        const cmds = rule.hooks.map((h) => h.command).join(", ");
        const matcherInfo = rule.matcher ? ` (matcher: ${rule.matcher})` : "";
        bellHooks.push(`${event}${matcherInfo}: ${cmds}`);
      }
    }
  }

  return { installed: bellHooks.length > 0, hooks: bellHooks };
}
