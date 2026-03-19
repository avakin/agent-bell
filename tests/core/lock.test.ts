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

const { acquireLock, releaseLock } = await import("../../src/core/lock.js");

describe("lock", () => {
  beforeEach(() => {
    mkdirSync(testHome, { recursive: true });
  });

  afterEach(() => {
    try { releaseLock(); } catch { /* ok */ }
    rmSync(testHome, { recursive: true, force: true });
  });

  it("acquires lock on first call", () => {
    expect(acquireLock()).toBe(true);
  });

  it("fails to acquire lock when already held", () => {
    expect(acquireLock()).toBe(true);
    expect(acquireLock()).toBe(false);
  });

  it("can re-acquire after release", () => {
    expect(acquireLock()).toBe(true);
    releaseLock();
    expect(acquireLock()).toBe(true);
  });
});
