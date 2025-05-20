import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { BlobClient } from "../../src/blob/blobClient.js";
import { useBlob } from "../../src/blob/useBlob.js";

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

suite("GenSX Storage", () => {
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

  test("BlobClient should implement blob storage functionality", () => {
    const client = new BlobClient({ kind: "filesystem", rootDir: tempDir });

    // Check if it implements the expected interface
    expect(client).toBeDefined();
    expect(typeof client.getBlob).toBe("function");
    expect(typeof client.listBlobs).toBe("function");
    expect(typeof client.blobExists).toBe("function");
    expect(typeof client.deleteBlob).toBe("function");

    // Check that it returns a valid blob
    const blob = client.getBlob("test");
    expect(blob).toBeDefined();
    expect(typeof blob.getJSON).toBe("function");
    expect(typeof blob.getString).toBe("function");
    expect(typeof blob.putJSON).toBe("function");
    expect(typeof blob.putString).toBe("function");
    expect(typeof blob.delete).toBe("function");
    expect(typeof blob.exists).toBe("function");
    expect(typeof blob.getMetadata).toBe("function");
    expect(typeof blob.updateMetadata).toBe("function");
  });

  test("BlobClient should work with cloud configuration", () => {
    // Mock fetch for RemoteBlobStorage to prevent actual API calls
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: { get: () => null },
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve(""),
        json: () => Promise.resolve({}),
      } as unknown as Response),
    );

    const client = new BlobClient({
      kind: "cloud",
      project: "test-project",
      environment: "test-environment",
    });

    const blob = client.getBlob("test");
    expect(blob).toBeDefined();
    expect(typeof blob.getJSON).toBe("function");
    expect(typeof blob.getString).toBe("function");
  });

  test("useBlob should return a valid blob with working functionality", async () => {
    const blob = useBlob("test", { kind: "filesystem", rootDir: tempDir });

    // Test string operations
    const testString = "Hello, World!";
    await blob.putString(testString);
    const retrievedString = await blob.getString();
    expect(retrievedString).toBe(testString);

    // Test JSON operations
    const testData = { id: 1, name: "Test" };
    await blob.putJSON(testData);
    const retrievedData = await blob.getJSON();
    expect(retrievedData).toEqual(testData);

    // Test metadata operations
    const metadata = { tags: "test" };
    await blob.updateMetadata(metadata);
    const retrievedMetadata = await blob.getMetadata();
    expect(retrievedMetadata).toMatchObject({
      tags: "test",
      contentType: expect.any(String) as string,
      etag: expect.any(String) as string,
    });

    // Test exists
    const exists = await blob.exists();
    expect(exists).toBe(true);

    // Test delete
    await blob.delete();
    const existsAfterDelete = await blob.exists();
    expect(existsAfterDelete).toBe(false);
  });

  test("useBlob should work with cloud configuration", () => {
    // Mock fetch for RemoteBlobStorage to prevent actual API calls
    vi.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        headers: { get: () => null },
        status: 200,
        statusText: "OK",
        text: () => Promise.resolve(""),
        json: () => Promise.resolve({}),
      } as unknown as Response),
    );

    const blob = useBlob("test", {
      kind: "cloud",
      project: "test-project",
      environment: "test-environment",
    });

    expect(blob).toBeDefined();
    expect(typeof blob.getJSON).toBe("function");
    expect(typeof blob.getString).toBe("function");
  });

  suite("BlobClient", () => {
    test("should automatically detect cloud storage in cloud environment", () => {
      process.env.GENSX_RUNTIME = "cloud";

      const client = new BlobClient();
      expect(client).toBeDefined();
      // Note: We can't directly test the storage type since it's private
      // but we can verify it works by using it
      const blob = client.getBlob("test");
      expect(blob).toBeDefined();
    });

    test("should automatically detect filesystem storage in non-cloud environment", () => {
      delete process.env.GENSX_RUNTIME;

      const client = new BlobClient();
      expect(client).toBeDefined();
      const blob = client.getBlob("test");
      expect(blob).toBeDefined();
    });

    test("should override automatic detection with explicit kind", () => {
      process.env.GENSX_RUNTIME = "cloud";

      const client = new BlobClient({ kind: "filesystem", rootDir: tempDir });
      expect(client).toBeDefined();
      const blob = client.getBlob("test");
      expect(blob).toBeDefined();
    });

    test("should handle blobExists method", async () => {
      const client = new BlobClient({ kind: "filesystem", rootDir: tempDir });
      const key = "exists-test";

      // Create a blob
      await client.getBlob(key).putString("test");

      // Check if it exists
      const exists = await client.blobExists(key);
      expect(exists).toBe(true);

      // Check non-existent blob
      const notExists = await client.blobExists("non-existent");
      expect(notExists).toBe(false);
    });

    test("should handle deleteBlob method", async () => {
      const client = new BlobClient({ kind: "filesystem", rootDir: tempDir });
      const key = "delete-test";

      // Create a blob
      await client.getBlob(key).putString("test");

      // Delete it
      const result = await client.deleteBlob(key);
      expect(result).toBeDefined();

      // Verify it's gone
      const exists = await client.blobExists(key);
      expect(exists).toBe(false);
    });

    test("should handle default prefix", async () => {
      const client = new BlobClient({
        kind: "filesystem",
        rootDir: tempDir,
        defaultPrefix: "test-prefix",
      });

      // Create a blob
      await client.getBlob("test").putString("test");

      // List blobs
      const result = await client.listBlobs();
      expect(result.blobs).toHaveLength(1);
      expect(result.blobs[0].key).toBe("test");
    });
  });

  suite("useBlob", () => {
    test("should create a new client instance for each call", () => {
      const blob1 = useBlob("test1", { kind: "filesystem", rootDir: tempDir });
      const blob2 = useBlob("test2", { kind: "filesystem", rootDir: tempDir });

      // They should be different instances
      expect(blob1).not.toBe(blob2);
    });

    test("should handle different configurations per call", async () => {
      // First call with filesystem
      const fsBlob = useBlob("test", { kind: "filesystem", rootDir: tempDir });
      await fsBlob.putString("fs-data");

      // Second call with cloud (mocked)
      vi.spyOn(global, "fetch").mockImplementation(() =>
        Promise.resolve({
          ok: true,
          headers: { get: () => "mock-etag" },
        } as unknown as Response),
      );

      const cloudBlob = useBlob("test", {
        kind: "cloud",
        project: "test-project",
        environment: "test-environment",
      });
      await cloudBlob.putString("cloud-data");

      // Both should work independently
      const fsData = await fsBlob.getString();
      expect(fsData).toBe("fs-data");
    });

    test("should handle default configuration", () => {
      const blob = useBlob("test");
      expect(blob).toBeDefined();
    });

    test("should handle type parameters", () => {
      interface TestType {
        id: number;
        name: string;
      }

      const blob = useBlob<TestType>("test");
      expect(blob).toBeDefined();
    });

    test("should handle default prefix", async () => {
      const blob = useBlob("test", {
        kind: "filesystem",
        rootDir: tempDir,
        defaultPrefix: "test-prefix",
      });

      await blob.putString("test");
      const data = await blob.getString();
      expect(data).toBe("test");
    });
  });
});
