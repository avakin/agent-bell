import { loadConfig, saveConfig, getConfigPath } from "../core/config-manager.js";
import { log } from "../utils/logger.js";

export function configShowCommand(): void {
  const config = loadConfig();
  console.log(JSON.stringify(config, null, 2));
  log.dim(`\nConfig file: ${getConfigPath()}`);
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

  const lastKey = parts[parts.length - 1];
  if (!(lastKey in target)) {
    log.error(`Unknown config key: ${key}`);
    return;
  }

  // Type coercion
  const existing = target[lastKey];
  if (typeof existing === "number") {
    target[lastKey] = Number(value);
  } else if (typeof existing === "boolean") {
    target[lastKey] = value === "true" || value === "1";
  } else {
    target[lastKey] = value;
  }

  saveConfig(config);
  log.success(`Set ${key} = ${JSON.stringify(target[lastKey])}`);
}
