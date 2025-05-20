import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { SearchClient } from "../../src/search/searchClient.js";
import { Namespace } from "../../src/search/types.js";
import { useSearch } from "../../src/search/useSearch.js";

// Track namespace cache state for testing
const namespacesCache = new Map<string, boolean>();

// Mock the remote.js module which contains the SearchStorage implementation
vi.mock("../../src/search/remote.js", () => {
  // Mock class implementation
  const MockSearchStorage = vi
    .fn()
    .mockImplementation((project: string, environment: string) => {
      return {
        project,
        environment,
        hasEnsuredNamespace: (name: string): boolean =>
          namespacesCache.has(name),
        getNamespace: (name: string) => ({
          namespaceId: name,
          query: vi.fn().mockResolvedValue([]),
          upsert: vi.fn().mockResolvedValue({}),
          delete: vi.fn().mockResolvedValue({}),
          patch: vi.fn().mockResolvedValue({}),
        }),
        ensureNamespace: vi.fn().mockImplementation((name: string) => {
          const exists = namespacesCache.has(name);
          if (!exists) {
            namespacesCache.set(name, true);
            return Promise.resolve({ created: true, exists: false });
          }
          return Promise.resolve({ created: false, exists: true });
        }),
        deleteNamespace: vi.fn().mockImplementation((name: string) => {
          namespacesCache.delete(name);
          return Promise.resolve({ deleted: true });
        }),
        listNamespaces: vi.fn().mockImplementation(() => {
          const namespaces = Array.from(namespacesCache.keys()).map((name) => ({
            name,
            createdAt: new Date(),
          }));
          return Promise.resolve({
            namespaces,
            nextCursor: undefined,
          });
        }),
        namespaceExists: vi.fn().mockImplementation((name: string) => {
          return Promise.resolve(namespacesCache.has(name));
        }),
      };
    });

  return {
    SearchStorage: MockSearchStorage,
  };
});

// Extended Namespace type for testing
interface TestNamespace extends Namespace {
  upsert: () => Promise<unknown>;
  delete: () => Promise<unknown>;
  patch: () => Promise<unknown>;
}

suite("GenSX Search", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clear the namespace cache before each test
    namespacesCache.clear();

    // Setup environment variables for cloud storage
    process.env.GENSX_API_KEY = "test-api-key";
    process.env.GENSX_ORG = "test-org";
    process.env.GENSX_PROJECT = "test-project";
    process.env.GENSX_ENV = "test-environment";
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  suite("SearchClient", () => {
    test("should automatically detect cloud storage in cloud environment", async () => {
      process.env.GENSX_RUNTIME = "cloud";

      const client = new SearchClient();
      expect(client).toBeDefined();

      // Test that it works by getting a namespace
      const namespace = await client.getNamespace("test-namespace");
      expect(namespace).toBeDefined();
      expect(namespace.namespaceId).toBe("test-namespace");
    });

    test("should handle namespace ensuring", async () => {
      const client = new SearchClient();

      // First call should create the namespace
      const result1 = await client.ensureNamespace("test-namespace");
      expect(result1.created).toBe(true);
      expect(result1.exists).toBe(false);

      // Second call should find the existing namespace
      const result2 = await client.ensureNamespace("test-namespace");
      expect(result2.created).toBe(false);
      expect(result2.exists).toBe(true);
    });

    test("should handle namespace listing", async () => {
      const client = new SearchClient();

      // Create some test namespaces
      await client.ensureNamespace("ns1");
      await client.ensureNamespace("ns2");

      const result = await client.listNamespaces();
      expect(result.namespaces).toHaveLength(2);
      expect(result.namespaces.map((ns) => ns.name)).toContain("ns1");
      expect(result.namespaces.map((ns) => ns.name)).toContain("ns2");
    });

    test("should handle namespace deletion", async () => {
      const client = new SearchClient();

      // Create a namespace
      await client.ensureNamespace("test-namespace");

      // Delete it
      const result = await client.deleteNamespace("test-namespace");
      expect(result.deleted).toBe(true);

      // Verify it's gone
      const exists = await client.namespaceExists("test-namespace");
      expect(exists).toBe(false);
    });

    test("should handle namespace existence check", async () => {
      const client = new SearchClient();

      // Check non-existent namespace
      const exists1 = await client.namespaceExists("non-existent");
      expect(exists1).toBe(false);

      // Create and check existing namespace
      await client.ensureNamespace("test-namespace");
      const exists2 = await client.namespaceExists("test-namespace");
      expect(exists2).toBe(true);
    });
  });

  suite("useSearch", () => {
    test("should create a new client instance for each call", async () => {
      const ns1 = await useSearch("test1");
      const ns2 = await useSearch("test2");

      // They should be different instances
      expect(ns1).not.toBe(ns2);
    });

    test("should handle different configurations per call", async () => {
      // First call with default config
      const ns1 = await useSearch("test");

      // Second call with explicit config
      const ns2 = await useSearch("test", {
        project: "test-project",
        environment: "test-environment",
      });

      // Both should be defined
      expect(ns1).toBeDefined();
      expect(ns2).toBeDefined();
    });

    test("should ensure namespace exists before returning", async () => {
      const namespace = await useSearch("test-namespace");
      expect(namespace).toBeDefined();

      // Namespace should exist
      const client = new SearchClient();
      const exists = await client.namespaceExists("test-namespace");
      expect(exists).toBe(true);
    });

    test("should return a namespace with all required methods", async () => {
      const namespace = (await useSearch("test-namespace")) as TestNamespace;

      // Check that the namespace has all required methods
      expect(typeof namespace.query).toBe("function");
      expect(typeof namespace.upsert).toBe("function");
      expect(typeof namespace.delete).toBe("function");
      expect(typeof namespace.patch).toBe("function");
    });
  });
});
