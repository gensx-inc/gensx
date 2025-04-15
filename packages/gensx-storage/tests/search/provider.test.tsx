/** @jsxRuntime automatic */
/** @jsxImportSource @gensx/core */
import * as gensx from "@gensx/core";
import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { SearchContext } from "../../src/search/context.js";
import { SearchProvider } from "../../src/search/provider.js";
import {
  DeleteNamespaceResult,
  EnsureNamespaceResult,
  Namespace,
  SearchStorage,
} from "../../src/search/types.js";

// Mock the remote.js module which contains the SearchStorage implementation
vi.mock("../../src/search/remote.js", () => {
  // Track namespace cache state for testing
  const namespacesCache = new Map<string, boolean>();

  // Mock class implementation
  const MockSearchStorage = vi
    .fn()
    .mockImplementation((defaultPrefix?: string) => {
      return {
        defaultPrefix,
        hasEnsuredNamespace: (name: string): boolean =>
          namespacesCache.has(name),
        getNamespace: (name: string) => ({
          namespaceId: defaultPrefix ? `${defaultPrefix}/${name}` : name,
        }),
        ensureNamespace: vi
          .fn()
          .mockImplementation(
            (name: string): Promise<EnsureNamespaceResult> => {
              const exists = namespacesCache.has(name);
              if (!exists) {
                namespacesCache.set(name, true);
                return Promise.resolve({ created: true, exists: false });
              }
              return Promise.resolve({ created: false, exists: true });
            },
          ),
        deleteNamespace: vi
          .fn()
          .mockImplementation(
            (name: string): Promise<DeleteNamespaceResult> => {
              namespacesCache.delete(name);
              return Promise.resolve({ deleted: true });
            },
          ),
        listNamespaces: vi.fn().mockResolvedValue([]),
        namespaceExists: vi.fn().mockResolvedValue(false),
      };
    });

  return {
    SearchStorage: MockSearchStorage,
  };
});

suite("SearchProvider", () => {
  beforeEach(() => {
    // Mock environment variables for cloud provider tests
    process.env.GENSX_API_KEY = "test-api-key";
    process.env.GENSX_ORG = "test-org";
  });

  afterEach(() => {
    // Clear environment variables
    delete process.env.GENSX_API_KEY;
    delete process.env.GENSX_ORG;
  });

  test("provides search context to children", async () => {
    let contextProvided = false;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(SearchContext);
      if (context) {
        contextProvided = true;
      }
      return null;
    });

    await gensx.execute(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>,
    );

    expect(contextProvided).toBe(true);
  });

  test("namespace caching works correctly", async () => {
    let capturedStorage: SearchStorage | undefined;

    const TestComponent = gensx.Component<{}, null>("TestComponent", () => {
      const context = gensx.useContext(SearchContext);
      if (!context) throw new Error("SearchContext not found");
      capturedStorage = context;
      return null;
    });

    await gensx.execute(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>,
    );

    expect(capturedStorage).toBeDefined();
    const search = capturedStorage!;

    // First call to ensureDatabase should create the database
    const result1 = await search.ensureNamespace("test-db");
    expect(result1.created).toBe(true);
    expect(result1.exists).toBe(false);

    // Second call should find the existing database
    const result2 = await search.ensureNamespace("test-db");
    expect(result2.created).toBe(false);
    expect(result2.exists).toBe(true);

    // Database should be in the cache
    expect(search.hasEnsuredNamespace("test-db")).toBe(true);

    // Delete the database
    const deleteResult = await search.deleteNamespace("test-db");
    expect(deleteResult.deleted).toBe(true);

    // Database should be removed from cache
    expect(search.hasEnsuredNamespace("test-db")).toBe(false);
  });

  test("useSearch hook provides and caches namespaces", async () => {
    // Import the useSearch hook
    const { useSearch } = await import("../../src/search/context.js");

    let capturedNamespace: Namespace | undefined;
    let searchHookSuccess = false;

    const TestComponent = gensx.Component<{}, null>(
      "TestComponent",
      async () => {
        try {
          // Use the useSearch hook to get a namespace
          const namespace = await useSearch("test-search-db");
          capturedNamespace = namespace;
          searchHookSuccess = true;
        } catch (_error) {
          searchHookSuccess = false;
        }
        return null;
      },
    );

    await gensx.execute(
      <SearchProvider>
        <TestComponent />
      </SearchProvider>,
    );

    // The hook should have successfully obtained a namespace
    expect(searchHookSuccess).toBe(true);
    expect(capturedNamespace).toBeDefined();

    // Verify the namespace properties
    if (capturedNamespace) {
      expect(capturedNamespace.namespaceId).toBe("test-search-db");
    }

    // Get the storage instance to verify caching
    let storageInstance: SearchStorage | undefined;

    const StorageCheckComponent = gensx.Component<{}, null>(
      "StorageCheckComponent",
      () => {
        const context = gensx.useContext(SearchContext);
        if (!context) throw new Error("SearchContext not found");
        storageInstance = context;
        return null;
      },
    );

    await gensx.execute(
      <SearchProvider>
        <StorageCheckComponent />
      </SearchProvider>,
    );

    // Verify the namespace was cached in the storage
    expect(storageInstance!.hasEnsuredNamespace("test-search-db")).toBe(true);
  });
});
