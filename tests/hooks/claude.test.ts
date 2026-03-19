import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync, writeFileSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const testHome = path.join(tmpdir(), `agent-bell-test-${randomBytes(4).toString("hex")}`);
vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("os");
  return { ...actual, homedir: () => testHome };
});

const { installClaudeHooks, uninstallClaudeHooks, getClaudeHookStatus } = await import(
  "../../src/hooks/claude.js"
);

describe("claude hooks", () => {
  const claudeDir = path.join(testHome, ".claude");
  const settingsPath = path.join(claudeDir, "settings.json");

  beforeEach(() => {
    mkdirSync(claudeDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testHome, { recursive: true, force: true });
  });

  it("installs hooks with correct matcher+hooks format", () => {
    installClaudeHooks();

    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    expect(settings.hooks).toBeDefined();

    // Stop: one rule with empty matcher
    expect(settings.hooks.Stop).toHaveLength(1);
    expect(settings.hooks.Stop[0].matcher).toBe("");
    expect(settings.hooks.Stop[0].hooks).toHaveLength(1);
    expect(settings.hooks.Stop[0].hooks[0].type).toBe("command");
    expect(settings.hooks.Stop[0].hooks[0].command).toBe("agent-bell play task-complete --source claude");
    expect(settings.hooks.Stop[0]._agent_bell).toBe(true);

    // Notification: two rules with matchers
    expect(settings.hooks.Notification).toHaveLength(2);
    expect(settings.hooks.Notification[0].matcher).toBe("permission_prompt");
    expect(settings.hooks.Notification[0].hooks[0].command).toBe("agent-bell play needs-input --source claude");
    expect(settings.hooks.Notification[1].matcher).toBe("idle_prompt");
  });

  it("preserves existing settings and hooks", () => {
    writeFileSync(settingsPath, JSON.stringify({
      permissions: { allow: ["read"] },
      hooks: {
        Stop: [{ matcher: "Bash", hooks: [{ type: "command", command: "my-script" }] }],
      },
    }));

    installClaudeHooks();

    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    expect(settings.permissions.allow).toEqual(["read"]);
    // Existing Stop rule preserved, agent-bell rule added
    expect(settings.hooks.Stop).toHaveLength(2);
    expect(settings.hooks.Stop[0].matcher).toBe("Bash");
    expect(settings.hooks.Stop[1]._agent_bell).toBe(true);
  });

  it("creates backup before modifying", () => {
    writeFileSync(settingsPath, JSON.stringify({ existing: true }));

    installClaudeHooks();

    const files = readdirSync(claudeDir);
    const backups = files.filter((f: string) => f.includes("agent-bell-backup"));
    expect(backups.length).toBeGreaterThan(0);
  });

  it("uninstalls only agent-bell hooks", () => {
    writeFileSync(settingsPath, JSON.stringify({
      hooks: {
        Stop: [
          { matcher: "Bash", hooks: [{ type: "command", command: "my-script" }] },
          { matcher: "", hooks: [{ type: "command", command: "agent-bell play task-complete --source claude" }], _agent_bell: true },
        ],
        Notification: [
          { matcher: "permission_prompt", hooks: [{ type: "command", command: "agent-bell play needs-input --source claude" }], _agent_bell: true },
        ],
      },
    }));

    uninstallClaudeHooks();

    const settings = JSON.parse(readFileSync(settingsPath, "utf8"));
    expect(settings.hooks.Stop).toHaveLength(1);
    expect(settings.hooks.Stop[0].matcher).toBe("Bash");
    expect(settings.hooks.Notification).toBeUndefined();
  });

  it("reports hook status correctly", () => {
    const before = getClaudeHookStatus();
    expect(before.installed).toBe(false);

    installClaudeHooks();

    const after = getClaudeHookStatus();
    expect(after.installed).toBe(true);
    expect(after.hooks.length).toBeGreaterThan(0);
  });
});
