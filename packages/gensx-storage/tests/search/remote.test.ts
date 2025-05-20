/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */

import { afterEach, beforeEach, describe, expect, suite, test, vi } from "vitest";

import {
  SearchApiError,
  SearchNetworkError,
  SearchNotFoundError, // Assuming this might be used for 404s if not handled as success
} from "../../../src/search/remote"; // Adjust path if SearchError types are exported from main index
import { SearchStorage, SearchNamespace } from "../../../src/search/remote.js";
import { QueryResults, Schema } from "../../../src/search/types";


suite("SearchStorage and SearchNamespace", () => {
  const originalEnv = { ...process.env };
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  const TEST_PROJECT = "test-search-project";
  const TEST_ENVIRONMENT = "test-search-environment";
  const TEST_NAMESPACE_ID = "test-namespace";
  const BASE_API_URL = "https://api.gensx.com"; // Or use the one exported from module if available

  beforeEach(() => {
    process.env.GENSX_API_KEY = "test-api-key";
    process.env.GENSX_ORG = "test-org";
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  describe("SearchStorage Initialization", () => {
    test("should initialize with environment variables", () => {
      expect(() => new SearchStorage(TEST_PROJECT, TEST_ENVIRONMENT)).not.toThrow();
    });

    test("should throw if API key is missing", () => {
      delete process.env.GENSX_API_KEY;
      expect(() => new SearchStorage(TEST_PROJECT, TEST_ENVIRONMENT)).toThrow("GENSX_API_KEY");
    });

    test("should throw if organization ID is missing", () => {
      delete process.env.GENSX_ORG;
      expect(() => new SearchStorage(TEST_PROJECT, TEST_ENVIRONMENT)).toThrow("Organization ID");
    });
  });

  describe("SearchNamespace - query() - Error Handling Scenarios", () => {
    let namespace: SearchNamespace;

    beforeEach(() => {
      // Assuming SearchStorage.getNamespace correctly returns a SearchNamespace instance
      const storage = new SearchStorage(TEST_PROJECT, TEST_ENVIRONMENT);
      namespace = storage.getNamespace(TEST_NAMESPACE_ID) as SearchNamespace;
    });

    // Scenario 1: API returns error with JSON `error` field.
    test("Scenario 1: API returns error with JSON `error` field", async () => {
      const detailedErrorMessage = "Detailed Search API error from JSON";
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        clone: () => ({
          json: async () => ({ error: detailedErrorMessage }),
          text: async () => JSON.stringify({ error: detailedErrorMessage }),
        }),
      } as Response);

      try {
        await namespace.query({ vector: [0.1, 0.2], topK: 1 });
        expect.fail("Should have thrown SearchApiError");
      } catch (e) {
        expect(e).toBeInstanceOf(SearchApiError);
        expect((e as SearchApiError).message).toContain(detailedErrorMessage);
        expect((e as SearchApiError).message).toContain("(Status: 400)");
      }
    });

    // Scenario 2: API returns error with JSON body but NO `error` field.
    test("Scenario 2: API returns error with JSON body but NO `error` field", async () => {
      const errorBody = { message: "Some other Search JSON issue" };
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        clone: () => ({
          json: async () => errorBody,
          text: async () => JSON.stringify(errorBody),
        }),
      } as Response);

      try {
        await namespace.query({ vector: [0.1, 0.2], topK: 1 });
        expect.fail("Should have thrown SearchApiError");
      } catch (e) {
        expect(e).toBeInstanceOf(SearchApiError);
        expect((e as SearchApiError).message).toContain(JSON.stringify(errorBody));
        expect((e as SearchApiError).message).toContain("(Status: 500)");
      }
    });

    // Scenario 3: API returns error with non-JSON text body.
    test("Scenario 3: API returns error with non-JSON text body", async () => {
      const plainTextMessage = "A plain text Search error from server";
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        clone: () => ({
          json: async () => { throw new Error("Not JSON"); },
          text: async () => plainTextMessage,
        }),
      } as Response);

      try {
        await namespace.query({ vector: [0.1, 0.2], topK: 1 });
        expect.fail("Should have thrown SearchApiError");
      } catch (e) {
        expect(e).toBeInstanceOf(SearchApiError);
        expect((e as SearchApiError).message).toContain(plainTextMessage);
        expect((e as SearchApiError).message).toContain("(Status: 403)");
      }
    });

    // Scenario 4: API returns error, and body parsing fails (fallback to statusText).
    test("Scenario 4: API returns error, body parsing fails (fallback to statusText)", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Search Service Unavailable",
        clone: () => ({
          json: async () => { throw new Error("Cannot parse JSON"); },
          text: async () => { throw new Error("Cannot read text"); },
        }),
      } as Response);

      try {
        await namespace.query({ vector: [0.1, 0.2], topK: 1 });
        expect.fail("Should have thrown SearchApiError");
      } catch (e) {
        expect(e).toBeInstanceOf(SearchApiError);
        expect((e as SearchApiError).message).toContain("Search Service Unavailable");
        expect((e as SearchApiError).message).toContain("(Status: 503)");
      }
    });

    // Scenario 5: Network Error (fetch throws).
    test("Scenario 5: Network Error (fetch throws for query)", async () => {
      const networkErrorMessage = "Search Network failure simulation for query";
      fetchSpy.mockRejectedValueOnce(new Error(networkErrorMessage));

      try {
        await namespace.query({ vector: [0.1, 0.2], topK: 1 });
        expect.fail("Should have thrown SearchNetworkError");
      } catch (e) {
        expect(e).toBeInstanceOf(SearchNetworkError);
        expect((e as SearchNetworkError).message).toContain("Network error during query");
        expect((e as SearchNetworkError).message).toContain(networkErrorMessage);
        expect((e as SearchNetworkError).cause?.message).toBe(networkErrorMessage);
      }
    });

    // Scenario 6: Successful API call (query).
    test("Scenario 6: Successful API call for query", async () => {
      const mockQueryResults: QueryResults = { results: [{ id: "vec1", values: [0.1, 0.2], attributes: {} }] };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockQueryResults,
        clone: function () { return this; }
      } as Response);
      
      const results = await namespace.query({ vector: [0.1, 0.2], topK: 1 });
      expect(results).toEqual(mockQueryResults);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("SearchStorage - listNamespaces() - Error Handling", () => {
    let storage: SearchStorage;
    beforeEach(() => {
        storage = new SearchStorage(TEST_PROJECT, TEST_ENVIRONMENT);
    });

    test("Network Error (fetch throws for listNamespaces)", async () => {
        const networkErrorMessage = "Search Network failure for listNamespaces";
        fetchSpy.mockRejectedValueOnce(new Error(networkErrorMessage));

        try {
            await storage.listNamespaces();
            expect.fail("Should have thrown SearchNetworkError");
        } catch (e) {
            expect(e).toBeInstanceOf(SearchNetworkError);
            expect((e as SearchNetworkError).message).toContain("Network error during listNamespaces");
            expect((e as SearchNetworkError).message).toContain(networkErrorMessage);
        }
    });

    test("API error with JSON `error` field for listNamespaces", async () => {
        const detailedErrorMessage = "Detailed error for listNamespaces";
        fetchSpy.mockResolvedValueOnce({
            ok: false, status: 500, statusText: "Server Error",
            clone: () => ({
                json: async () => ({ error: detailedErrorMessage }),
                text: async () => JSON.stringify({ error: detailedErrorMessage }),
            }),
        } as Response);
        try {
            await storage.listNamespaces();
            expect.fail("Should have thrown SearchApiError");
        } catch (e) {
            expect(e).toBeInstanceOf(SearchApiError);
            expect((e as SearchApiError).message).toContain(detailedErrorMessage);
            expect((e as SearchApiError).message).toContain("(Status: 500)");
        }
    });
  });
  
  describe("SearchNamespace - getSchema - Success Case", () => {
    test("should get schema successfully", async () => {
      const storage = new SearchStorage(TEST_PROJECT, TEST_ENVIRONMENT);
      const namespace = storage.getNamespace(TEST_NAMESPACE_ID);
      const mockSchema: Schema = {
        schemaVersion: 1,
        indexConfig: { type: "hnsw", parameters: {} },
        defaultDistanceMetric: "cosine_distance",
        dimensions: 2,
        fields: [{ name: "vector", type: "vector", dimensions: 2 }],
      };

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSchema,
        clone: function () { return this; }
      } as Response);

      const schema = await namespace.getSchema();
      expect(schema).toEqual(mockSchema);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_API_URL}/org/test-org/projects/${TEST_PROJECT}/environments/${TEST_ENVIRONMENT}/search/${TEST_NAMESPACE_ID}/schema`,
        expect.objectContaining({ method: "GET" })
      );
    });
  });

  describe("SearchStorage - ensureNamespace - Success Case", () => {
    test("should ensure namespace successfully (created)", async () => {
      const storage = new SearchStorage(TEST_PROJECT, TEST_ENVIRONMENT);
      const mockEnsureResult = { created: true, exists: true };
      fetchSpy.mockResolvedValueOnce({
        ok: true, // API might return 201 for created, 200 for exists
        status: 201, 
        json: async () => mockEnsureResult,
        clone: function () { return this; }
      } as Response);

      const result = await storage.ensureNamespace(TEST_NAMESPACE_ID);
      expect(result).toEqual(mockEnsureResult);
      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_API_URL}/org/test-org/projects/${TEST_PROJECT}/environments/${TEST_ENVIRONMENT}/search/${TEST_NAMESPACE_ID}/ensure`,
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  // Add more tests for other methods (write, updateSchema, getMetadata, deleteNamespace, etc.)
  // covering both success and the 6 error scenarios where applicable.
  // For brevity, only a subset is shown here.
});
