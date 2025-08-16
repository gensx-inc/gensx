import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, expect, suite, test } from "vitest";

import { createFileSystemKVStorage } from "../../src/kv/filesystem.js";
import { KVStorage } from "../../src/kv/types.js";

async function createTempDir(): Promise<string> {
  const dir = path.join(
    os.tmpdir(),
    `gensx-kv-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  );
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function cleanupTempDir(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

suite("FileSystemKVStorage", () => {
  let tempDir: string;
  let storage: KVStorage;

  beforeEach(async () => {
    tempDir = await createTempDir();
    storage = createFileSystemKVStorage({ rootDir: tempDir });
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  test("should store and retrieve values with TTL", async () => {
    const kv = storage.getKV<string>("foo");
    await kv.set("bar", { ttl: 1 });
    const val = await kv.get();
    expect(val).toBe("bar");

    // wait for ttl to expire
    await new Promise((r) => setTimeout(r, 1100));
    const expired = await kv.get();
    expect(expired).toBeNull();
  });

  test("exists and delete work", async () => {
    const kv = storage.getKV("baz");
    expect(await kv.exists()).toBe(false);
    await kv.set({ test: true });
    expect(await storage.keyExists("baz")).toBe(true);
    await storage.deleteKey("baz");
    expect(await kv.exists()).toBe(false);
  });
});
