/** @jsxRuntime automatic */
/** @jsxImportSource @gensx/core */
import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import * as gensx from "@gensx/core";
import { afterEach, beforeEach, expect, suite, test } from "vitest";

import { DatabaseContext } from "../../src/database/context.js";
import { FileSystemDatabaseStorage } from "../../src/database/filesystem.js";
import { DatabaseProvider } from "../../src/database/provider.js";
import { RemoteDatabaseStorage } from "../../src/database/remote.js";
import {
  CloudDatabaseProviderProps,
  DatabaseProviderProps,
  FileSystemDatabaseProviderProps,
} from "../../src/database/types.js";
import { DatabaseStorage } from "../../src/database/types.js";

// Helper to create temporary test directories
async function createTempDir(): Promise<string> {
  const tempDir = path.join(
    os.tmpdir(),
    `gensx-storage-test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  );
  await fs.mkdir(tempDir, { recursive: true });
  return tempDir;
}

// Helper to clean up temporary test directories
async function cleanupTempDir(tempDir: string): Promise<void> {
  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Failed to clean up temp directory ${tempDir}:`, err);
  }
}

suite("DatabaseProvider", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir();

    // Mock environment variables for cloud provider tests
    process.env.GENSX_API_KEY = "test-api-key";
    process.env.GENSX_ORG = "test-org";
    process.env.GENSX_PROJECT = "test-project";
    process.env.GENSX_ENV = "test-environment";
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
    // Clear environment variables
    delete process.env.GENSX_API_KEY;
    delete process.env.GENSX_ORG;
    delete process.env.GENSX_PROJECT;
    delete process.env.GENSX_ENV;
  });

  test("provides filesystem storage to children", async () => {
    let capturedStorage: DatabaseStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(DatabaseContext);
      if (!context) throw new Error("DatabaseContext not found");
      capturedStorage = context;
      return null;
    });

    const props: DatabaseProviderProps = {
      kind: "filesystem",
      rootDir: tempDir,
    };

    await gensx.execute(
      <DatabaseProvider {...props}>
        <TestComponent />
      </DatabaseProvider>,
    );

    expect(capturedStorage).toBeDefined();
    expect(capturedStorage).toHaveProperty("rootPath", tempDir);
    expect(capturedStorage).toBeInstanceOf(FileSystemDatabaseStorage);
  });

  test("provides cloud storage to children", async () => {
    let capturedStorage: DatabaseStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(DatabaseContext);
      if (!context) throw new Error("DatabaseContext not found");
      capturedStorage = context;
      return null;
    });

    const props: DatabaseProviderProps = {
      kind: "cloud",
    };

    await gensx.execute(
      <DatabaseProvider {...props}>
        <TestComponent />
      </DatabaseProvider>,
    );

    expect(capturedStorage).toBeDefined();
    expect(capturedStorage).toHaveProperty("apiKey", "test-api-key");
    expect(capturedStorage).toBeInstanceOf(RemoteDatabaseStorage);
  });

  test("database caching works correctly", async () => {
    let capturedStorage: DatabaseStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(DatabaseContext);
      if (!context) throw new Error("DatabaseContext not found");
      capturedStorage = context;
      return null;
    });

    const props: DatabaseProviderProps = {
      kind: "filesystem",
      rootDir: tempDir,
    };

    await gensx.execute(
      <DatabaseProvider {...props}>
        <TestComponent />
      </DatabaseProvider>,
    );

    expect(capturedStorage).toBeDefined();
    const storage = capturedStorage as FileSystemDatabaseStorage;

    // First call to ensureDatabase should create the database
    const result1 = await storage.ensureDatabase("test-db");
    expect(result1.created).toBe(true);
    expect(result1.exists).toBe(false);

    // Second call should find the existing database
    const result2 = await storage.ensureDatabase("test-db");
    expect(result2.created).toBe(false);
    expect(result2.exists).toBe(true);

    // Database should be in the cache
    expect(storage.hasEnsuredDatabase("test-db")).toBe(true);

    // Delete the database
    const deleteResult = await storage.deleteDatabase("test-db");
    expect(deleteResult.deleted).toBe(true);

    // Database should be removed from cache
    expect(storage.hasEnsuredDatabase("test-db")).toBe(false);
  });

  test("defaults to filesystem storage when kind is not provided and GENSX_RUNTIME is not cloud", async () => {
    let capturedStorage: DatabaseStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(DatabaseContext);
      if (!context) throw new Error("DatabaseContext not found");
      capturedStorage = context;
      return null;
    });

    // Ensure GENSX_RUNTIME is not set
    delete process.env.GENSX_RUNTIME;

    const props: FileSystemDatabaseProviderProps = {
      rootDir: tempDir,
    };

    await gensx.execute(
      <DatabaseProvider {...props}>
        <TestComponent />
      </DatabaseProvider>,
    );

    expect(capturedStorage).toBeDefined();
    expect(capturedStorage).toHaveProperty("rootPath", tempDir);
    expect(capturedStorage).toBeInstanceOf(FileSystemDatabaseStorage);
  });

  test("defaults to cloud storage when kind is not provided and GENSX_RUNTIME is cloud", async () => {
    let capturedStorage: DatabaseStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(DatabaseContext);
      if (!context) throw new Error("DatabaseContext not found");
      capturedStorage = context;
      return null;
    });

    // Set GENSX_RUNTIME to cloud
    process.env.GENSX_RUNTIME = "cloud";

    const props: CloudDatabaseProviderProps = {};

    await gensx.execute(
      <DatabaseProvider {...props}>
        <TestComponent />
      </DatabaseProvider>,
    );

    expect(capturedStorage).toBeDefined();
    expect(capturedStorage).toHaveProperty("apiKey", "test-api-key");
    expect(capturedStorage).toBeInstanceOf(RemoteDatabaseStorage);
  });

  test("uses provided kind even when GENSX_RUNTIME is set", async () => {
    let capturedStorage: DatabaseStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(DatabaseContext);
      if (!context) throw new Error("DatabaseContext not found");
      capturedStorage = context;
      return null;
    });

    // Set GENSX_RUNTIME to cloud but provide filesystem kind
    process.env.GENSX_RUNTIME = "cloud";

    const props: FileSystemDatabaseProviderProps = {
      kind: "filesystem",
      rootDir: tempDir,
    };

    await gensx.execute(
      <DatabaseProvider {...props}>
        <TestComponent />
      </DatabaseProvider>,
    );

    expect(capturedStorage).toBeDefined();
    expect(capturedStorage).toHaveProperty("rootPath", tempDir);
    expect(capturedStorage).toBeInstanceOf(FileSystemDatabaseStorage);
  });
});
