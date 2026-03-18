import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

// Mock homedir to use temp directory
const testHome = join(tmpdir(), `agent-bell-test-${randomBytes(4).toString("hex")}`);
vi.mock("os", async () => {
  const actual = await vi.importActual<typeof import("os")>("os");
  return { ...actual, homedir: () => testHome };
});

const { loadConfig, saveConfig, updateConfig, getConfigDir } = await import(
  "../../src/core/config-manager.js"
);
const { DEFAULT_CONFIG } = await import("../../src/types/index.js");

describe("config-manager", () => {
  beforeEach(() => {
    mkdirSync(testHome, { recursive: true });
  });

  afterEach(() => {
    rmSync(testHome, { recursive: true, force: true });
  });

  it("returns default config when no file exists", () => {
    const config = loadConfig();
    expect(config.theme).toBe("galactic");
    expect(config.cooldown).toBe(3);
    expect(config.volume).toBe(0.7);
  });

  it("saves and loads config", () => {
    const config = { ...DEFAULT_CONFIG, theme: "cyberpunk", volume: 0.5 };
    saveConfig(config);

    const loaded = loadConfig();
    expect(loaded.theme).toBe("cyberpunk");
    expect(loaded.volume).toBe(0.5);
  });

  it("updates config partially", () => {
    saveConfig(DEFAULT_CONFIG);
    const updated = updateConfig({ theme: "arcane" });
    expect(updated.theme).toBe("arcane");
    expect(updated.volume).toBe(0.7); // Unchanged

    const loaded = loadConfig();
    expect(loaded.theme).toBe("arcane");
  });

  it("creates config directory if missing", () => {
    const configDir = getConfigDir();
    expect(existsSync(configDir)).toBe(false);

    saveConfig(DEFAULT_CONFIG);
    expect(existsSync(configDir)).toBe(true);
  });
});
