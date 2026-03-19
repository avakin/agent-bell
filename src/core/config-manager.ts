import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { type AgentBellConfig, DEFAULT_CONFIG } from "../types/index.js";
import { deepMerge } from "../hooks/common.js";
import { logToFile } from "../utils/logger.js";

const CONFIG_DIR = path.join(homedir(), ".agent-bell");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): AgentBellConfig {
  ensureConfigDir();
  if (!existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }
  try {
    const raw = readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<AgentBellConfig>;
    return deepMerge(
      DEFAULT_CONFIG as unknown as Record<string, unknown>,
      parsed as unknown as Record<string, unknown>,
    ) as unknown as AgentBellConfig;
  } catch (error) {
    logToFile("Failed to parse config, using defaults", error);
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AgentBellConfig): void {
  ensureConfigDir();
  atomicWrite(CONFIG_FILE, JSON.stringify(config, null, 2) + "\n");
}

export function updateConfig(updates: Partial<AgentBellConfig>): AgentBellConfig {
  const config = loadConfig();
  const merged = deepMerge(
    config as unknown as Record<string, unknown>,
    updates as unknown as Record<string, unknown>,
  ) as unknown as AgentBellConfig;
  saveConfig(merged);
  return merged;
}

function atomicWrite(filePath: string, content: string): void {
  const dir = path.dirname(filePath);
  const tmpFile = path.join(dir, `.tmp-${randomBytes(6).toString("hex")}`);
  writeFileSync(tmpFile, content, "utf8");
  renameSync(tmpFile, filePath);
}
