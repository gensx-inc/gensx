import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, expect, suite, test } from "vitest";

import { KVClient } from "../../src/kv/kvClient.js";
import { useKV } from "../../src/kv/useKV.js";

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

suite("GenSX KV", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  test("KVClient works", async () => {
    const client = new KVClient({ kind: "filesystem", rootDir: tempDir });
    const kv = client.getKV<string>("foo");
    await kv.set("bar");
    expect(await kv.get()).toBe("bar");
  });

  test("useKV returns new instance", async () => {
    const kv1 = await useKV("a", { kind: "filesystem", rootDir: tempDir });
    const kv2 = await useKV("b", { kind: "filesystem", rootDir: tempDir });
    expect(kv1).not.toBe(kv2);
  });
});
