import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

const testHome = path.join(tmpdir(), `agent-bell-test-${randomBytes(4).toString("hex")}`);
vi.mock("node:os", async () => {
  const actual = await vi.importActual<typeof import("node:os")>("os");
  return { ...actual, homedir: () => testHome };
});

const { shouldPlay, shouldEscalate, recordPlay, clearEscalation } = await import(
  "../../src/core/state-manager.js"
);

describe("state-manager", () => {
  beforeEach(() => {
    mkdirSync(testHome, { recursive: true });
  });

  afterEach(() => {
    rmSync(testHome, { recursive: true, force: true });
  });

  it("allows first play of any event", () => {
    expect(shouldPlay("task-complete", 3)).toBe(true);
  });

  it("blocks play within cooldown", () => {
    recordPlay("task-complete");
    expect(shouldPlay("task-complete", 3)).toBe(false);
  });

  it("allows play after cooldown expires", () => {
    recordPlay("task-complete");
    // Manually advance — in real code, time passes
    expect(shouldPlay("task-complete", 0)).toBe(true);
  });

  it("does not escalate on first play", () => {
    expect(shouldEscalate("task-complete", 30)).toBe(false);
  });

  it("clears escalation tracking", () => {
    recordPlay("task-complete");
    clearEscalation("task-complete");
    expect(shouldEscalate("task-complete", 0)).toBe(false);
  });
});
