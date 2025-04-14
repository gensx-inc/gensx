/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */

import type { DistanceMetric, Filters } from "@turbopuffer/turbopuffer";

import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { SearchProvider } from "../../src/search/provider.js";
import {
  SearchError,
  SearchInternalError,
  SearchNetworkError,
  SearchStorage,
} from "../../src/search/remote.js";
import { Schema } from "../../src/search/types.js";

suite("GenSX Search Storage", () => {
  // Save original environment
  const originalEnv = { ...process.env };
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup environment variables for remote storage
    process.env.GENSX_API_KEY = "test-api-key";
    process.env.GENSX_ORG = "test-org";

    // Reset and setup fetch mock
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  test("should initialize with environment variables", () => {
    expect(() => new SearchStorage()).not.toThrow();
  });

  test("should throw if API key is missing", () => {
    delete process.env.GENSX_API_KEY;
    expect(() => new SearchStorage()).toThrow("GENSX_API_KEY");
  });

  test("should throw if organization ID is missing", () => {
    delete process.env.GENSX_ORG;
    expect(() => new SearchStorage()).toThrow("Organization ID");
  });

  test("should implement SearchStorage interface when properly configured", () => {
    const storage = new SearchStorage();

    // Check if it implements the SearchStorage interface
    expect(storage).toBeDefined();
    expect(typeof storage.getNamespace).toBe("function");
    expect(typeof storage.listNamespaces).toBe("function");
    expect(typeof storage.deleteNamespace).toBe("function");
    expect(typeof storage.namespaceExists).toBe("function");
    expect(typeof storage.ensureNamespace).toBe("function");
    expect(typeof storage.hasEnsuredNamespace).toBe("function");

    // Check that it returns a valid namespace
    const namespace = storage.getNamespace("test");
    expect(namespace).toBeDefined();
    expect(typeof namespace.upsert).toBe("function");
    expect(typeof namespace.delete).toBe("function");
    expect(typeof namespace.deleteByFilter).toBe("function");
    expect(typeof namespace.query).toBe("function");
    expect(typeof namespace.getMetadata).toBe("function");
    expect(typeof namespace.getSchema).toBe("function");
    expect(typeof namespace.updateSchema).toBe("function");
  });

  test("should honor defaultPrefix", () => {
    const prefix = "test-prefix";
    const storage = new SearchStorage(prefix);

    // Spy on internal methods
    const getNamespaceSpy = vi.spyOn(storage, "getNamespace");

    // Call methods that should use the prefix
    const namespace = storage.getNamespace("test");

    // Check that the namespace was requested with the prefix
    expect(getNamespaceSpy).toHaveBeenCalledWith("test");
    expect(namespace.namespaceId).toBe("test-prefix/test");
  });

  test("should be able to import and use SearchProvider", () => {
    expect(SearchProvider).toBeDefined();
  });

  test("should ensure a namespace", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: { created: true, exists: false },
      }),
    });

    const storage = new SearchStorage();
    const result = await storage.ensureNamespace("test-ns");

    expect(result).toEqual({ created: true, exists: false });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns/ensure"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );

    // Check internal cache is updated
    expect(storage.hasEnsuredNamespace("test-ns")).toBe(true);
  });

  test("should delete a namespace", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: { deleted: true },
      }),
    });

    const storage = new SearchStorage();

    // First make sure namespace is in the cache
    storage.getNamespace("test-ns");
    expect(storage.hasEnsuredNamespace("test-ns")).toBe(true);

    // Now delete it
    const result = await storage.deleteNamespace("test-ns");

    expect(result).toEqual({ deleted: true });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns"),
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );

    // Check internal cache is updated
    expect(storage.hasEnsuredNamespace("test-ns")).toBe(false);
  });

  test("should list namespaces", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: { namespaces: ["test-ns1", "test-ns2"] },
      }),
    });

    const storage = new SearchStorage();
    const namespaces = await storage.listNamespaces();

    expect(namespaces).toEqual(["test-ns1", "test-ns2"]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should check if a namespace exists", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const storage = new SearchStorage();
    const exists = await storage.namespaceExists("test-ns");

    expect(exists).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns"),
      expect.objectContaining({
        method: "HEAD",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should return false for non-existent namespace", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const storage = new SearchStorage();
    const exists = await storage.namespaceExists("non-existent");

    expect(exists).toBe(false);
  });

  test("should query vectors by similarity", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: [
          { id: "1", dist: 0.9, attributes: { text: "test document" } },
          { id: "2", dist: 0.8, attributes: { text: "another document" } },
        ],
      }),
    });

    const storage = new SearchStorage();
    const namespace = storage.getNamespace("test-ns");

    const results = await namespace.query({
      vector: [0.1, 0.2, 0.3],
      topK: 2,
    });

    expect(results.length).toBe(2);
    expect(results[0].id).toBe("1");
    expect(results[0].dist).toBe(0.9);
    expect(results[0].attributes?.text).toBe("test document");

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns/query"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains the query parameters
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      vector: [0.1, 0.2, 0.3],
      topK: 2,
      includeVectors: false,
    });
  });

  test("should upsert vectors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: {},
      }),
    });

    const storage = new SearchStorage();
    const namespace = storage.getNamespace("test-ns");

    const vectors = [
      {
        id: "1",
        vector: [0.1, 0.2, 0.3],
        attributes: { text: "test document" },
      },
      {
        id: "2",
        vector: [0.4, 0.5, 0.6],
        attributes: { text: "another document" },
      },
    ];

    await namespace.upsert({
      vectors,
      distanceMetric: "cosine_distance" as DistanceMetric,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns/vectors"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains the vectors
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      vectors,
      distanceMetric: "cosine_distance",
      batchSize: 1000,
      schema: undefined,
    });
  });

  test("should delete vectors by ID", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: { success: true },
      }),
    });

    const storage = new SearchStorage();
    const namespace = storage.getNamespace("test-ns");

    await namespace.delete({ ids: ["1", "2"] });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns/delete"),
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains the IDs
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ ids: ["1", "2"] });
  });

  test("should delete vectors by filter", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: {
          message: "Deleted 2 vectors",
          rowsAffected: 2,
        },
      }),
    });

    const storage = new SearchStorage();
    const namespace = storage.getNamespace("test-ns");

    const filters = {
      $and: [{ "attributes.text": { $eq: "test document" } }],
    } as unknown as Filters;

    const result = await namespace.deleteByFilter({ filters });

    expect(result).toBe(2);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns/deleteByFilter"),
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains the filters
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ filters });
  });

  test("should get namespace metadata", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: {
          metadata: {
            dimensions: 3,
            distanceMetric: "cosine",
            vectorCount: 100,
          },
        },
      }),
    });

    const storage = new SearchStorage();
    const namespace = storage.getNamespace("test-ns");

    const metadata = await namespace.getMetadata();

    expect(metadata).toEqual({
      dimensions: 3,
      distanceMetric: "cosine",
      vectorCount: 100,
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should get schema", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: {
          text: { type: "string", filterable: true, fullTextSearch: true },
          rating: { type: "number", filterable: true },
        },
      }),
    });

    const storage = new SearchStorage();
    const namespace = storage.getNamespace("test-ns");

    const schema = await namespace.getSchema();

    // Use any to work around the Schema type issues
    expect(schema).toEqual({
      text: { type: "string", filterable: true, fullTextSearch: true },
      rating: { type: "number", filterable: true },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns/schema"),
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should update schema", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: {
          text: { type: "string", filterable: true, fullTextSearch: true },
          rating: { type: "number", filterable: true },
          new_field: { type: "string", filterable: false },
        },
      }),
    });

    const storage = new SearchStorage();
    const namespace = storage.getNamespace("test-ns");

    // Use any to work around the Schema type issues
    const schema = {
      text: { type: "string", filterable: true, fullTextSearch: true },
      rating: { type: "number", filterable: true },
      new_field: { type: "string", filterable: false },
    } as Schema;

    const updatedSchema = await namespace.updateSchema({ schema });

    // Use any to work around the Schema type issues
    expect(updatedSchema).toEqual(schema);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns/schema"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains the schema
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual(schema);
  });

  suite("Error Handling", () => {
    test("should handle API error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "error",
          error: "API error message",
        }),
      });

      const storage = new SearchStorage();

      try {
        await storage.ensureNamespace("api-error");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(SearchInternalError);
        expect((err as SearchError).code).toBe("INTERNAL_ERROR");
        expect((err as SearchError).message).toContain("API error");
      }
    });

    test("should handle HTTP error status codes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const storage = new SearchStorage();

      try {
        await storage.ensureNamespace("server-error");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(SearchInternalError);
        expect((err as SearchError).code).toBe("INTERNAL_ERROR");
      }
    });

    test("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const storage = new SearchStorage();

      try {
        await storage.ensureNamespace("network-error");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(SearchNetworkError);
        expect((err as SearchError).code).toBe("NETWORK_ERROR");
        expect((err as SearchError).message).toContain("Network failure");
      }
    });
  });

  test("should handle prefix in listNamespaces", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: { namespaces: ["test/ns1", "test/ns2"] },
      }),
    });

    const storage = new SearchStorage();
    const namespaces = await storage.listNamespaces({ prefix: "test" });

    expect(namespaces).toEqual(["test/ns1", "test/ns2"]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/search.*prefix=test/),
      expect.any(Object),
    );
  });

  test("should handle default prefix in listNamespaces", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: { namespaces: ["default-prefix/ns1", "default-prefix/ns2"] },
      }),
    });

    const storage = new SearchStorage("default-prefix");
    const namespaces = await storage.listNamespaces();

    expect(namespaces).toEqual(["ns1", "ns2"]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/search.*prefix=default-prefix/),
      expect.any(Object),
    );
  });

  test("should combine default prefix with provided prefix", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: {
          namespaces: ["default-prefix/sub/ns1", "default-prefix/sub/ns2"],
        },
      }),
    });

    const storage = new SearchStorage("default-prefix");
    const namespaces = await storage.listNamespaces({ prefix: "sub" });

    expect(namespaces).toEqual(["sub/ns1", "sub/ns2"]);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/search.*prefix=default-prefix%2Fsub/),
      expect.any(Object),
    );
  });
});
