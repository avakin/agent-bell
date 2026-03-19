import { loadConfig, saveConfig, getConfigPath } from "../core/config-manager.js";
import { listThemes } from "../core/theme-manager.js";
import { log } from "../utils/logger.js";

export function configShowCommand(): void {
  const config = loadConfig();
  console.log(JSON.stringify(config, null, 2));
  log.dim(`\nConfig file: ${getConfigPath()}`);
}

function validateConfigValue(key: string, value: unknown): string | null {
  switch (key) {
    case "volume": {
      if (typeof value === "number" && (value < 0 || value > 1)) {
        return "Volume must be between 0 and 1";
      }
      break;
    }
    case "cooldown": {
      if (typeof value === "number" && value < 0) {
        return "Cooldown must be >= 0";
      }
      break;
    }
    case "escalation_delay": {
      if (typeof value === "number" && value < 0) {
        return "Escalation delay must be >= 0";
      }
      break;
    }
    case "theme": {
      if (typeof value === "string") {
        const themes = listThemes();
        if (!themes.some((t) => t.name === value)) {
          return "Unknown theme. Run 'agent-bell themes list'";
        }
      }
      break;
    }
  }

  // Check for tools.*.events
  if ((key === "events" || key.endsWith(".events")) && typeof value === "string" && value !== "auto" && value !== "granular") {
      return "Events preset must be 'auto' or 'granular'";
    }

  return null;
}

export function configSetCommand(key: string, value: string): void {
  const config = loadConfig();

  // Handle dotted keys like tools.claude.enabled
  const parts = key.split(".");
  let target: Record<string, unknown> = config as unknown as Record<string, unknown>;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (typeof target[part] !== "object" || target[part] === null) {
      log.error(`Invalid config key: ${key}`);
      return;
    }
    target = target[part] as Record<string, unknown>;
  }

  const lastKey = parts.at(-1);
  if (!lastKey || !(lastKey in target)) {
    log.error(`Unknown config key: ${key}`);
    return;
  }

  // Type coercion
  const existing: unknown = target[lastKey];
  let coerced: unknown;
  if (typeof existing === "number") {
    coerced = Number(value);
  } else if (typeof existing === "boolean") {
    coerced = value === "true" || value === "1";
  } else {
    coerced = value;
  }

  // Validation
  const error = validateConfigValue(lastKey, coerced);
  if (error) {
    log.error(error);
    return;
  }

  target[lastKey] = coerced;

  saveConfig(config);
  log.success(`Set ${key} = ${JSON.stringify(target[lastKey])}`);
}
