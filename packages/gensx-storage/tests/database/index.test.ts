import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { DatabaseClient } from "../../src/database/databaseClient.js";
import { useDatabase } from "../../src/database/useDatabase.js";

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

// Helper to mock successful cloud API responses
function mockSuccessfulCloudResponse() {
  return vi.spyOn(global, "fetch").mockImplementation(() =>
    Promise.resolve({
      ok: true,
      headers: { get: () => "mock-etag" },
      json: () => Promise.resolve({ data: {} }),
    } as unknown as Response),
  );
}

suite("GenSX Database", () => {
  let tempDir: string;
  const originalEnv = { ...process.env };

  beforeEach(async () => {
    tempDir = await createTempDir();

    // Setup environment variables for cloud storage
    process.env.GENSX_API_KEY = "test-api-key";
    process.env.GENSX_ORG = "test-org";
    process.env.GENSX_PROJECT = "test-project";
    process.env.GENSX_ENV = "test-environment";
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
    // Restore original environment
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  suite("DatabaseClient", () => {
    test("should automatically detect cloud storage in cloud environment", async () => {
      process.env.GENSX_RUNTIME = "cloud";

      // Mock cloud API responses
      const mockFetch = mockSuccessfulCloudResponse();

      const client = new DatabaseClient();
      expect(client).toBeDefined();

      // Test that it works by getting a database
      const db = await client.getDatabase("test-db");
      expect(db).toBeDefined();

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalled();
    });

    test("should automatically detect filesystem storage in non-cloud environment", async () => {
      delete process.env.GENSX_RUNTIME;

      const client = new DatabaseClient();
      expect(client).toBeDefined();

      const db = await client.getDatabase("test-db");
      expect(db).toBeDefined();
    });

    test("should override automatic detection with explicit kind", async () => {
      process.env.GENSX_RUNTIME = "cloud";

      const client = new DatabaseClient({
        kind: "filesystem",
        rootDir: tempDir,
      });
      expect(client).toBeDefined();

      const db = await client.getDatabase("test-db");
      expect(db).toBeDefined();
    });

    test("should handle database ensuring", async () => {
      const client = new DatabaseClient({
        kind: "filesystem",
        rootDir: tempDir,
      });

      // First call should create the database
      const result1 = await client.ensureDatabase("test-db");
      expect(result1.created).toBe(true);
      expect(result1.exists).toBe(false);

      // Second call should find the existing database
      const result2 = await client.ensureDatabase("test-db");
      expect(result2.created).toBe(false);
      expect(result2.exists).toBe(true);
    });

    test("should handle database listing", async () => {
      const client = new DatabaseClient({
        kind: "filesystem",
        rootDir: tempDir,
      });

      // Create some test databases
      await client.ensureDatabase("db1");
      await client.ensureDatabase("db2");

      const result = await client.listDatabases();
      expect(result.databases).toHaveLength(2);
      expect(result.databases.map((db) => db.name)).toContain("db1");
      expect(result.databases.map((db) => db.name)).toContain("db2");
    });

    test("should handle database deletion", async () => {
      const client = new DatabaseClient({
        kind: "filesystem",
        rootDir: tempDir,
      });

      // Create a database
      await client.ensureDatabase("test-db");

      // Delete it
      const result = await client.deleteDatabase("test-db");
      expect(result.deleted).toBe(true);

      // Verify it's gone
      const exists = await client.databaseExists("test-db");
      expect(exists).toBe(false);
    });

    test("should handle database existence check", async () => {
      const client = new DatabaseClient({
        kind: "filesystem",
        rootDir: tempDir,
      });

      // Check non-existent database
      const exists1 = await client.databaseExists("non-existent");
      expect(exists1).toBe(false);

      // Create and check existing database
      await client.ensureDatabase("test-db");
      const exists2 = await client.databaseExists("test-db");
      expect(exists2).toBe(true);
    });
  });

  suite("useDatabase", () => {
    test("should create a new client instance for each call", async () => {
      const db1 = await useDatabase("test1", {
        kind: "filesystem",
        rootDir: tempDir,
      });
      const db2 = await useDatabase("test2", {
        kind: "filesystem",
        rootDir: tempDir,
      });

      // They should be different instances
      expect(db1).not.toBe(db2);
    });

    test("should handle different configurations per call", async () => {
      // First call with filesystem
      const fsDb = await useDatabase("test", {
        kind: "filesystem",
        rootDir: tempDir,
      });

      // Second call with cloud (mocked)
      const mockFetch = mockSuccessfulCloudResponse();

      const cloudDb = await useDatabase("test", {
        kind: "cloud",
        project: "test-project",
        environment: "test-environment",
      });

      // Both should be defined
      expect(fsDb).toBeDefined();
      expect(cloudDb).toBeDefined();

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalled();
    });

    test("should handle default configuration", async () => {
      const db = await useDatabase("test");
      expect(db).toBeDefined();
    });

    test("should ensure database exists before returning", async () => {
      const db = await useDatabase("test-db", {
        kind: "filesystem",
        rootDir: tempDir,
      });
      expect(db).toBeDefined();

      // Database should exist
      const client = new DatabaseClient({
        kind: "filesystem",
        rootDir: tempDir,
      });
      const exists = await client.databaseExists("test-db");
      expect(exists).toBe(true);
    });
  });
});
