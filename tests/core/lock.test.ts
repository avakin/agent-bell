import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mkdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { randomBytes } from "crypto";

const testHome = join(tmpdir(), `agent-bell-test-${randomBytes(4).toString("hex")}`);
vi.mock("os", async () => {
  const actual = await vi.importActual<typeof import("os")>("os");
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
