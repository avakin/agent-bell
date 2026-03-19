import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

const testHome = join(tmpdir(), `agent-bell-test-opencode-${randomBytes(4).toString("hex")}`);
vi.mock("os", async () => {
  const actual = await vi.importActual<typeof import("os")>("os");
  return { ...actual, homedir: () => testHome };
});

const { installOpenCodeHooks, uninstallOpenCodeHooks, getOpenCodeHookStatus } = await import(
  "../../src/hooks/opencode.js"
);

describe("opencode hooks", () => {
  const pluginDir = join(testHome, ".config", "opencode", "plugins");
  const pluginPath = join(pluginDir, "agent-bell.ts");

  beforeEach(() => {
    mkdirSync(join(testHome, ".config", "opencode"), { recursive: true });
  });

  afterEach(() => {
    rmSync(testHome, { recursive: true, force: true });
  });

  it("installs plugin file with correct content and marker", () => {
    installOpenCodeHooks();

    expect(existsSync(pluginPath)).toBe(true);
    const content = readFileSync(pluginPath, "utf-8");
    expect(content).toMatch(/^\/\/ @agent-bell-managed/);
    expect(content).toContain('case "session.idle"');
    expect(content).toContain('case "session.created"');
    expect(content).toContain('case "session.error"');
    expect(content).toContain('"tool.execute.after"');
    expect(content).toContain('"permission.ask"');
    expect(content).toContain("agent-bell play");
    expect(content).toContain("--source opencode");
    expect(content).toContain(".quiet()");
    expect(content).toContain(".nothrow()");
    expect(content).toContain("export default plugin");
    expect(content).toContain("@opencode-ai/plugin");
  });

  it("creates plugins directory if it does not exist", () => {
    rmSync(pluginDir, { recursive: true, force: true });

    installOpenCodeHooks();

    expect(existsSync(pluginPath)).toBe(true);
  });

  it("creates backup if plugin file already exists", () => {
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(pluginPath, "// existing plugin content");

    installOpenCodeHooks();

    const files = readdirSync(pluginDir);
    const backups = files.filter((f: string) => f.includes("agent-bell-backup"));
    expect(backups.length).toBeGreaterThan(0);
  });

  it("uninstalls by deleting the managed plugin file", () => {
    installOpenCodeHooks();
    expect(existsSync(pluginPath)).toBe(true);

    uninstallOpenCodeHooks();
    expect(existsSync(pluginPath)).toBe(false);
  });

  it("does NOT delete plugin file without marker", () => {
    mkdirSync(pluginDir, { recursive: true });
    writeFileSync(pluginPath, "// user's own plugin\nexport default {};");

    uninstallOpenCodeHooks();

    expect(existsSync(pluginPath)).toBe(true);
    expect(readFileSync(pluginPath, "utf-8")).toContain("user's own plugin");
  });

  it("reports hook status correctly", () => {
    const before = getOpenCodeHookStatus();
    expect(before.installed).toBe(false);
    expect(before.hooks).toEqual([]);

    installOpenCodeHooks();

    const after = getOpenCodeHookStatus();
    expect(after.installed).toBe(true);
    expect(after.hooks).toContain("session.idle");
    expect(after.hooks).toContain("session.created");
    expect(after.hooks).toContain("session.error");
    expect(after.hooks).toContain("tool.execute.after");
    expect(after.hooks).toContain("permission.ask");
  });
});
