/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */

import type {
  DistanceMetric,
  Filter,
} from "@turbopuffer/turbopuffer/resources";

import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import {
  SearchApiError,
  SearchError,
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
    expect(
      () => new SearchStorage("test-project", "test-environment"),
    ).not.toThrow();
  });

  test("should throw if API key is missing", () => {
    delete process.env.GENSX_API_KEY;
    expect(() => new SearchStorage("test-project", "test-environment")).toThrow(
      "GENSX_API_KEY",
    );
  });

  test("should throw if organization ID is missing", () => {
    delete process.env.GENSX_ORG;
    expect(() => new SearchStorage("test-project", "test-environment")).toThrow(
      "Organization ID",
    );
  });

  test("should implement SearchStorage interface when properly configured", () => {
    const storage = new SearchStorage("test-project", "test-environment");

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
    expect(typeof namespace.write).toBe("function");
    expect(typeof namespace.query).toBe("function");
    expect(typeof namespace.getSchema).toBe("function");
    expect(typeof namespace.updateSchema).toBe("function");
  });

  test("should ensure a namespace", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ created: true, exists: false }),
    });

    const storage = new SearchStorage("test-project", "test-environment");
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
      json: async () => ({ deleted: true }),
    });

    const storage = new SearchStorage("test-project", "test-environment");

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
        namespaces: [
          { name: "test-ns1", createdAt: "2024-01-01T00:00:00Z" },
          { name: "test-ns2", createdAt: "2024-01-02T00:00:00Z" },
        ],
        nextCursor: "next-page-token",
      }),
    });

    const storage = new SearchStorage("test-project", "test-environment");
    const result = await storage.listNamespaces();

    expect(result.namespaces).toEqual([
      { name: "test-ns1", createdAt: new Date("2024-01-01T00:00:00Z") },
      { name: "test-ns2", createdAt: new Date("2024-01-02T00:00:00Z") },
    ]);
    expect(result.nextCursor).toBe("next-page-token");
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

    const storage = new SearchStorage("test-project", "test-environment");
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

    const storage = new SearchStorage("test-project", "test-environment");
    const exists = await storage.namespaceExists("non-existent");

    expect(exists).toBe(false);
  });

  test("should query vectors by similarity", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        rows: [
          { id: "1", $dist: 0.9, text: "test document" },
          { id: "2", $dist: 0.8, text: "another document" },
        ],
      }),
    });

    const storage = new SearchStorage("test-project", "test-environment");
    const namespace = storage.getNamespace("test-ns");

    const results = await namespace.query({
      topK: 2,
    });

    expect(results.rows).toBeDefined();
    expect(results.rows!.length).toBe(2);
    expect(results.rows![0].id).toBe("1");
    expect(results.rows![0].$dist).toBe(0.9);
    expect(results.rows![0].text).toBe("test document");

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
      rankBy: undefined,
      topK: 2,
      includeAttributes: undefined,
      filters: undefined,
      aggregateBy: undefined,
      consistency: undefined,
    });
  });

  test("should write vectors with various operations", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        message: "Successfully wrote 2 rows",
        rowsAffected: 2,
      }),
    });

    const storage = new SearchStorage("test-project", "test-environment");
    const namespace = storage.getNamespace("test-ns");

    const vectors = [
      {
        id: "1",
        vector: [0.1, 0.2, 0.3],
        text: "test document",
      },
      {
        id: "2",
        vector: [0.4, 0.5, 0.6],
        text: "another document",
      },
    ];

    const result = await namespace.write({
      upsertRows: vectors,
      distanceMetric: "cosine_distance" as DistanceMetric,
      deletes: ["3", "4"],
      deleteByFilter: ["And", [["text", "Eq", "test document"]]] as Filter,
    });

    expect(result).toEqual({
      message: "Successfully wrote 2 rows",
      rowsAffected: 2,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains all operations
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      upsertRows: vectors,
      distanceMetric: "cosine_distance",
      deletes: ["3", "4"],
      deleteByFilter: ["And", [["text", "Eq", "test document"]]],
    });
  });

  test("should write vectors with upsert only", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        message: "Successfully wrote 2 rows",
        rowsAffected: 2,
      }),
    });

    const storage = new SearchStorage("test-project", "test-environment");
    const namespace = storage.getNamespace("test-ns");

    const vectors = [
      {
        id: "1",
        vector: [0.1, 0.2, 0.3],
        text: "test document",
      },
      {
        id: "2",
        vector: [0.4, 0.5, 0.6],
        text: "another document",
      },
    ];

    const result = await namespace.write({
      upsertRows: vectors,
      distanceMetric: "cosine_distance" as DistanceMetric,
    });

    expect(result).toEqual({
      message: "Successfully wrote 2 rows",
      rowsAffected: 2,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains only upsert operation
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      upsertRows: vectors,
      distanceMetric: "cosine_distance",
    });
  });

  test("should write vectors with delete by ID only", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        message: "Successfully deleted 2 rows",
        rowsAffected: 2,
      }),
    });

    const storage = new SearchStorage("test-project", "test-environment");
    const namespace = storage.getNamespace("test-ns");

    const result = await namespace.write({
      deletes: ["1", "2"],
    });

    expect(result).toEqual({
      message: "Successfully deleted 2 rows",
      rowsAffected: 2,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains only delete operation
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      deletes: ["1", "2"],
    });
  });

  test("should write vectors with delete by filter only", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        message: "Successfully deleted 2 rows",
        rowsAffected: 2,
      }),
    });

    const storage = new SearchStorage("test-project", "test-environment");
    const namespace = storage.getNamespace("test-ns");

    const result = await namespace.write({
      deleteByFilter: ["And", [["text", "Eq", "test document"]]] as Filter,
    });

    expect(result).toEqual({
      message: "Successfully deleted 2 rows",
      rowsAffected: 2,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/search/test-ns"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-api-key",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains only delete by filter operation
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      deleteByFilter: ["And", [["text", "Eq", "test document"]]],
    });
  });

  test("should get schema", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        text: { type: "string", filterable: true, fullTextSearch: true },
        rating: { type: "number", filterable: true },
      }),
    });

    const storage = new SearchStorage("test-project", "test-environment");
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
        text: { type: "string", filterable: true, fullTextSearch: true },
        rating: { type: "number", filterable: true },
        new_field: { type: "string", filterable: false },
      }),
    });

    const storage = new SearchStorage("test-project", "test-environment");
    const namespace = storage.getNamespace("test-ns");

    // Use any to work around the Schema type issues
    const schema = {
      text: { type: "string", filterable: true, fullTextSearch: true },
      rating: { type: "number", filterable: true },
      new_field: { type: "string", filterable: false },
    } as unknown as Schema;

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
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: async () => ({ error: "Bad Request" }),
      });

      const storage = new SearchStorage("test-project", "test-environment");

      try {
        await storage.ensureNamespace("api-error");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(SearchApiError);
        expect((err as SearchError).code).toBe("SEARCH_ERROR");
        expect((err as SearchError).message).toContain("Bad Request");
      }
    });

    test("should handle HTTP error status codes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({ error: "Internal Server Error" }),
      });

      const storage = new SearchStorage("test-project", "test-environment");

      try {
        await storage.ensureNamespace("server-error");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(SearchApiError);
        expect((err as SearchError).code).toBe("SEARCH_ERROR");
        expect((err as SearchError).message).toContain("Internal Server Error");
      }
    });

    test("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const storage = new SearchStorage("test-project", "test-environment");

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

    test("should handle missing data responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: async () => ({ error: "Not Found" }),
      });

      const storage = new SearchStorage("test-project", "test-environment");

      try {
        await storage.ensureNamespace("missing-data");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(SearchApiError);
        expect((err as SearchError).code).toBe("SEARCH_ERROR");
        expect((err as SearchError).message).toContain("Not Found");
      }
    });
  });

  test("should handle prefix in listNamespaces", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        namespaces: [
          { name: "test/ns1", createdAt: "2024-01-01T00:00:00Z" },
          { name: "test/ns2", createdAt: "2024-01-02T00:00:00Z" },
        ],
        nextCursor: "next-page-token",
      }),
    });

    const storage = new SearchStorage("test-project", "test-environment");
    const result = await storage.listNamespaces({ prefix: "test" });

    expect(result.namespaces).toEqual([
      { name: "test/ns1", createdAt: new Date("2024-01-01T00:00:00Z") },
      { name: "test/ns2", createdAt: new Date("2024-01-02T00:00:00Z") },
    ]);
    expect(result.nextCursor).toBe("next-page-token");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/search.*prefix=test/),
      expect.any(Object),
    );
  });

  test("should handle pagination in listNamespaces", async () => {
    // First page
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        namespaces: [
          { name: "ns1", createdAt: "2024-01-01T00:00:00Z" },
          { name: "ns2", createdAt: "2024-01-02T00:00:00Z" },
        ],
        nextCursor: "page2",
      }),
    });

    // Second page
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        namespaces: [
          { name: "ns3", createdAt: "2024-01-03T00:00:00Z" },
          { name: "ns4", createdAt: "2024-01-04T00:00:00Z" },
        ],
        nextCursor: undefined,
      }),
    });

    const storage = new SearchStorage("test-project", "test-environment");

    // Get first page
    const firstPage = await storage.listNamespaces({ limit: 2 });
    expect(firstPage.namespaces).toEqual([
      { name: "ns1", createdAt: new Date("2024-01-01T00:00:00Z") },
      { name: "ns2", createdAt: new Date("2024-01-02T00:00:00Z") },
    ]);
    expect(firstPage.nextCursor).toBe("page2");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/search.*limit=2/),
      expect.any(Object),
    );

    // Get second page
    const secondPage = await storage.listNamespaces({
      limit: 2,
      cursor: firstPage.nextCursor,
    });
    expect(secondPage.namespaces).toEqual([
      { name: "ns3", createdAt: new Date("2024-01-03T00:00:00Z") },
      { name: "ns4", createdAt: new Date("2024-01-04T00:00:00Z") },
    ]);
    expect(secondPage.nextCursor).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/search.*limit=2.*cursor=page2/),
      expect.any(Object),
    );
  });

  test("should handle empty results in listNamespaces", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        namespaces: [],
        nextCursor: undefined,
      }),
    });

    const storage = new SearchStorage("test-project", "test-environment");
    const result = await storage.listNamespaces({ limit: 10 });

    expect(result.namespaces).toEqual([]);
    expect(result.nextCursor).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/search.*limit=10/),
      expect.any(Object),
    );
  });
});
