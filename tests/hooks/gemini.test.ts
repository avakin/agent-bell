import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

const testHome = join(tmpdir(), `agent-bell-test-gemini-${randomBytes(4).toString("hex")}`);
vi.mock("os", async () => {
  const actual = await vi.importActual<typeof import("os")>("os");
  return { ...actual, homedir: () => testHome };
});

const { installGeminiHooks, uninstallGeminiHooks, getGeminiHookStatus } = await import(
  "../../src/hooks/gemini.js"
);

describe("gemini hooks", () => {
  const geminiDir = join(testHome, ".gemini");
  const settingsPath = join(geminiDir, "settings.json");

  beforeEach(() => {
    mkdirSync(geminiDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testHome, { recursive: true, force: true });
  });

  it("installs hooks with correct matcher+hooks format", () => {
    installGeminiHooks();

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.hooks).toBeDefined();

    // AfterAgent: one rule with empty matcher
    expect(settings.hooks.AfterAgent).toHaveLength(1);
    expect(settings.hooks.AfterAgent[0].matcher).toBe("");
    expect(settings.hooks.AfterAgent[0].hooks).toHaveLength(1);
    expect(settings.hooks.AfterAgent[0].hooks[0].type).toBe("command");
    expect(settings.hooks.AfterAgent[0].hooks[0].command).toBe("agent-bell play task-complete --source gemini");
    expect(settings.hooks.AfterAgent[0]._agent_bell).toBe(true);

    // Notification: one rule with empty matcher
    expect(settings.hooks.Notification).toHaveLength(1);
    expect(settings.hooks.Notification[0].matcher).toBe("");
    expect(settings.hooks.Notification[0].hooks[0].command).toBe("agent-bell play needs-input --source gemini");
  });

  it("preserves existing settings and hooks", () => {
    writeFileSync(settingsPath, JSON.stringify({
      customSetting: "value",
      hooks: {
        AfterAgent: [{ matcher: "*.py", hooks: [{ type: "command", command: "my-script" }] }],
      },
    }));

    installGeminiHooks();

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.customSetting).toBe("value");
    // Existing AfterAgent rule preserved, agent-bell rule added
    expect(settings.hooks.AfterAgent).toHaveLength(2);
    expect(settings.hooks.AfterAgent[0].matcher).toBe("*.py");
    expect(settings.hooks.AfterAgent[1]._agent_bell).toBe(true);
    // New Notification hook added
    expect(settings.hooks.Notification).toHaveLength(1);
  });

  it("creates backup before modifying", () => {
    writeFileSync(settingsPath, JSON.stringify({ existing: true }));

    installGeminiHooks();

    const files = readdirSync(geminiDir);
    const backups = files.filter((f: string) => f.includes("agent-bell-backup"));
    expect(backups.length).toBeGreaterThan(0);
  });

  it("uninstalls only agent-bell hooks", () => {
    writeFileSync(settingsPath, JSON.stringify({
      hooks: {
        AfterAgent: [
          { matcher: "*.py", hooks: [{ type: "command", command: "my-script" }] },
          { matcher: "", hooks: [{ type: "command", command: "agent-bell play task-complete --source gemini" }], _agent_bell: true },
        ],
        Notification: [
          { matcher: "", hooks: [{ type: "command", command: "agent-bell play needs-input --source gemini" }], _agent_bell: true },
        ],
      },
    }));

    uninstallGeminiHooks();

    const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    expect(settings.hooks.AfterAgent).toHaveLength(1);
    expect(settings.hooks.AfterAgent[0].matcher).toBe("*.py");
    // Notification should be removed entirely (no non-agent-bell hooks)
    expect(settings.hooks.Notification).toBeUndefined();
  });

  it("reports hook status correctly", () => {
    const before = getGeminiHookStatus();
    expect(before.installed).toBe(false);

    installGeminiHooks();

    const after = getGeminiHookStatus();
    expect(after.installed).toBe(true);
    expect(after.hooks.length).toBeGreaterThan(0);
  });
});
