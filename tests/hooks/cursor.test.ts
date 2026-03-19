import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const testHome = path.join(tmpdir(), `agent-bell-test-cursor-${randomBytes(4).toString("hex")}`);
vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("os");
  return { ...actual, homedir: () => testHome };
});

const { installCursorHooks, uninstallCursorHooks, getCursorHookStatus } = await import(
  "../../src/hooks/cursor.js"
);

describe("cursor hooks", () => {
  const cursorDir = path.join(testHome, ".cursor");
  const hooksPath = path.join(cursorDir, "hooks.json");

  beforeEach(() => {
    mkdirSync(cursorDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testHome, { recursive: true, force: true });
  });

  it("installs hooks with correct flat array format", () => {
    installCursorHooks();

    const settings = JSON.parse(readFileSync(hooksPath, "utf8"));
    expect(settings.hooks).toBeDefined();
    expect(Array.isArray(settings.hooks)).toBe(true);

    // stop event hook
    expect(settings.hooks).toHaveLength(1);
    expect(settings.hooks[0].event).toBe("stop");
    expect(settings.hooks[0].command).toBe("agent-bell play task-complete --source cursor");
    expect(settings.hooks[0]._agent_bell).toBe(true);
  });

  it("preserves existing hooks", () => {
    writeFileSync(hooksPath, JSON.stringify({
      hooks: [{ event: "stop", command: "my-custom-script" }],
      otherSetting: true,
    }));

    installCursorHooks();

    const settings = JSON.parse(readFileSync(hooksPath, "utf8"));
    expect(settings.otherSetting).toBe(true);
    // Existing hook preserved, agent-bell hook added
    expect(settings.hooks).toHaveLength(2);
    expect(settings.hooks[0].command).toBe("my-custom-script");
    expect(settings.hooks[1]._agent_bell).toBe(true);
  });

  it("creates backup before modifying", () => {
    writeFileSync(hooksPath, JSON.stringify({ existing: true }));

    installCursorHooks();

    const files = readdirSync(cursorDir);
    const backups = files.filter((f: string) => f.includes("agent-bell-backup"));
    expect(backups.length).toBeGreaterThan(0);
  });

  it("uninstalls only agent-bell hooks", () => {
    writeFileSync(hooksPath, JSON.stringify({
      hooks: [
        { event: "stop", command: "my-custom-script" },
        { event: "stop", command: "agent-bell play task-complete --source cursor", _agent_bell: true },
      ],
    }));

    uninstallCursorHooks();

    const settings = JSON.parse(readFileSync(hooksPath, "utf8"));
    expect(settings.hooks).toHaveLength(1);
    expect(settings.hooks[0].command).toBe("my-custom-script");
  });

  it("reports hook status correctly", () => {
    const before = getCursorHookStatus();
    expect(before.installed).toBe(false);

    installCursorHooks();

    const after = getCursorHookStatus();
    expect(after.installed).toBe(true);
    expect(after.hooks.length).toBeGreaterThan(0);
  });
});
