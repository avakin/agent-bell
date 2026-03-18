import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { GeminiSettings, GeminiHookRule } from "../types/index.js";
import { readJsonFile, createBackup, atomicWriteJson } from "./common.js";

const SETTINGS_PATH = join(homedir(), ".gemini", "settings.json");

function makeRule(matcher: string, command: string): GeminiHookRule {
  return {
    matcher,
    hooks: [{ type: "command", command }],
    _agent_bell: true,
  };
}

function getAgentBellHooks(): Record<string, GeminiHookRule[]> {
  return {
    AfterAgent: [
      makeRule("", "agent-bell play task-complete --source gemini"),
    ],
    Notification: [
      makeRule("", "agent-bell play needs-input --source gemini"),
    ],
  };
}

export function installGeminiHooks(): { backupPath: string | null } {
  const dir = join(homedir(), ".gemini");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const backupPath = createBackup(SETTINGS_PATH);
  const existing = readJsonFile<GeminiSettings>(SETTINGS_PATH) ?? {};

  // Remove existing agent-bell hooks
  const cleaned = removeGeminiAgentBellHooks(existing);

  // Merge in new hooks
  const newHooks = getAgentBellHooks();
  if (!cleaned.hooks) cleaned.hooks = {};

  for (const [event, rules] of Object.entries(newHooks)) {
    const existingRules = cleaned.hooks[event] ?? [];
    cleaned.hooks[event] = [...existingRules, ...rules];
  }

  atomicWriteJson(SETTINGS_PATH, cleaned);
  return { backupPath };
}

export function uninstallGeminiHooks(): void {
  if (!existsSync(SETTINGS_PATH)) return;

  createBackup(SETTINGS_PATH);
  const existing = readJsonFile<GeminiSettings>(SETTINGS_PATH);
  if (!existing) return;

  const cleaned = removeGeminiAgentBellHooks(existing);
  atomicWriteJson(SETTINGS_PATH, cleaned);
}

function removeGeminiAgentBellHooks(settings: GeminiSettings): GeminiSettings {
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

export function isGeminiInstalled(): boolean {
  return existsSync(join(homedir(), ".gemini"));
}

export function getGeminiHookStatus(): { installed: boolean; hooks: string[] } {
  if (!existsSync(SETTINGS_PATH)) return { installed: false, hooks: [] };

  const settings = readJsonFile<GeminiSettings>(SETTINGS_PATH);
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
