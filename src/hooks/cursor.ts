import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { CursorHooks } from "../types/index.js";
import { readJsonFile, createBackup, atomicWriteJson } from "./common.js";

const HOOKS_PATH = join(homedir(), ".cursor", "hooks.json");

function getAgentBellHooks(): CursorHooks["hooks"] {
  return [
    {
      event: "stop",
      command: "agent-bell play task-complete --source cursor",
      _agent_bell: true,
    },
  ];
}

export function installCursorHooks(): { backupPath: string | null } {
  const dir = join(homedir(), ".cursor");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const backupPath = createBackup(HOOKS_PATH);
  const existing = readJsonFile<CursorHooks>(HOOKS_PATH) ?? {};

  // Remove existing agent-bell hooks
  const cleaned = removeCursorAgentBellHooks(existing);

  // Merge in new hooks
  const newHooks = getAgentBellHooks()!;
  cleaned.hooks = [...(cleaned.hooks ?? []), ...newHooks];

  atomicWriteJson(HOOKS_PATH, cleaned);
  return { backupPath };
}

export function uninstallCursorHooks(): void {
  if (!existsSync(HOOKS_PATH)) return;

  createBackup(HOOKS_PATH);
  const existing = readJsonFile<CursorHooks>(HOOKS_PATH);
  if (!existing) return;

  const cleaned = removeCursorAgentBellHooks(existing);
  atomicWriteJson(HOOKS_PATH, cleaned);
}

function removeCursorAgentBellHooks(settings: CursorHooks): CursorHooks {
  if (!settings.hooks) return settings;

  const cleaned = { ...settings };
  cleaned.hooks = settings.hooks.filter((h) => !h._agent_bell);
  if (cleaned.hooks.length === 0) delete cleaned.hooks;

  return cleaned;
}

export function isCursorInstalled(): boolean {
  return existsSync(join(homedir(), ".cursor"));
}

export function getCursorHookStatus(): { installed: boolean; hooks: string[] } {
  if (!existsSync(HOOKS_PATH)) return { installed: false, hooks: [] };

  const settings = readJsonFile<CursorHooks>(HOOKS_PATH);
  if (!settings?.hooks) return { installed: false, hooks: [] };

  const bellHooks = settings.hooks
    .filter((h) => h._agent_bell)
    .map((h) => `${h.event}: ${h.command}`);

  return { installed: bellHooks.length > 0, hooks: bellHooks };
}
