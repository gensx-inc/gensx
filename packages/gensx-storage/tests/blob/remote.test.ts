/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */

import { Readable } from "node:stream";

import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { RemoteBlobStorage } from "../../src/blob/remote.js";
import {
  BlobConflictError,
  BlobError,
  BlobInternalError,
  BlobNetworkError,
} from "../../src/index.js";

suite("RemoteBlobStorage", () => {
  // Save original environment
  const originalEnv = { ...process.env };
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    // Setup mock environment variables
    process.env.GENSX_API_KEY = "test-api-key";
    process.env.GENSX_ORG = "test-org";

    // Reset and setup fetch mock
    fetchSpy = vi.spyOn(global, "fetch");
  });

  afterEach(async () => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.restoreAllMocks(); // Use restoreAllMocks to remove spy and restore original fetch
  });

  test("should initialize with environment variables", () => {
    expect(
      () => new RemoteBlobStorage("test-project", "test-environment"),
    ).not.toThrow();
  });

  test("should throw if API key is missing", () => {
    delete process.env.GENSX_API_KEY;
    expect(
      () => new RemoteBlobStorage("test-project", "test-environment"),
    ).toThrow("GENSX_API_KEY");
  });

  test("should throw if organization ID is missing", () => {
    delete process.env.GENSX_ORG;
    expect(
      () => new RemoteBlobStorage("test-project", "test-environment"),
    ).toThrow("Organization must");
  });

  test("should get JSON from a blob", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const mockData = { foo: "bar" };
    const mockStringContent = JSON.stringify(mockData);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        content: mockStringContent,
        etag: "mock-etag",
      }),
      clone: function () {
        return this;
      }, // Simple clone mock for success case
    } as Response);

    const blob = storage.getBlob<typeof mockData>("test-key");
    const result = await blob.getJSON();

    expect(result).not.toBeNull();
    if (!result) return;

    expect(result).toEqual(mockData);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob/test-key",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should parse JSON string content from API response", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const mockData = { messages: [{ role: "user", content: "Hello" }] };
    const mockStringContent = JSON.stringify(mockData);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        content: mockStringContent,
        etag: "mock-etag",
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob<typeof mockData>("test-key");
    const result = await blob.getJSON();

    // Ensure we got a result
    expect(result).not.toBeNull();
    if (!result) return; // TypeScript guard

    expect(result).toEqual(mockData);
    expect(result).not.toBe(mockStringContent); // Ensure it's not still a string
    expect(typeof result).toBe("object");
    expect(Array.isArray(result.messages)).toBe(true);
    expect(result.messages[0].role).toBe("user");
    expect(result.messages[0].content).toBe("Hello");
  });

  test("should handle non-existent blobs (getJSON returning null for 404)", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");

    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
      json: async () => ({}), // Should not be called if status is 404 by getJSON
      text: async () => "",
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob("non-existent");
    const result = await blob.getJSON();

    expect(result).toBeNull();
  });

  test("should put JSON to a blob", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const data = { foo: "bar" };

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ etag: "mock-etag" }), // Use Headers object
      json: async () => ({
        // This mock for json() might not be strictly necessary if the test focuses on putJSON's behavior
        // and the server response for put is just status and headers.
        // However, if putJSON tries to parse the response body (it doesn't according to current code), this would be relevant.
        content: JSON.stringify(data),
        contentType: "application/json",
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob<typeof data>("test-key");
    const result = await blob.putJSON(data);

    expect(result.etag).toBe("mock-etag");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob/test-key",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains the serialized content
    const [[, callOptions]] = fetchSpy.mock.calls; // Get the options of the first call
    const body = JSON.parse(callOptions!.body as string);
    expect(body).toEqual({
      content: JSON.stringify(data),
      contentType: "application/json",
    });
  });

  test("should list blobs with prefix", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const mockBlobs = [
      { key: "key1", lastModified: "2024-01-01T00:00:00Z", size: 100 },
      { key: "key2", lastModified: "2024-01-01T00:00:00Z", size: 200 },
      { key: "key3", lastModified: "2024-01-01T00:00:00Z", size: 300 },
    ];

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blobs: mockBlobs,
        nextCursor: null,
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const result = await storage.listBlobs({ prefix: "test-prefix" });

    expect(result.blobs).toEqual(mockBlobs);
    expect(result.nextCursor).toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob?prefix=test-prefix&limit=100",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should handle pagination with limit", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");

    // Mock first page response
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blobs: [
          { key: "key1", lastModified: "2024-01-01T00:00:00Z", size: 100 },
          { key: "key2", lastModified: "2024-01-01T00:00:00Z", size: 200 },
        ],
        nextCursor: "page1cursor",
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const firstPage = await storage.listBlobs({ limit: 2 });
    expect(firstPage.blobs).toHaveLength(2);
    expect(firstPage.blobs[0].key).toBe("key1");
    expect(firstPage.blobs[1].key).toBe("key2");
    expect(firstPage.nextCursor).toBe("page1cursor");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob?limit=2",
      expect.any(Object),
    );

    // Mock second page response
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blobs: [
          { key: "key3", lastModified: "2024-01-01T00:00:00Z", size: 300 },
        ],
        nextCursor: null,
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const secondPage = await storage.listBlobs({
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    });
    expect(secondPage.blobs).toHaveLength(1);
    expect(secondPage.blobs[0].key).toBe("key3");
    expect(secondPage.nextCursor).toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob?limit=2&cursor=page1cursor",
      expect.any(Object),
    );
  });

  test("should handle pagination with prefix", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");

    // Mock first page response
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blobs: [
          {
            key: "prefix/key1",
            lastModified: "2024-01-01T00:00:00Z",
            size: 100,
          },
          {
            key: "prefix/key2",
            lastModified: "2024-01-01T00:00:00Z",
            size: 200,
          },
        ],
        nextCursor: "page1cursor",
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const firstPage = await storage.listBlobs({
      prefix: "prefix",
      limit: 2,
    });
    expect(firstPage.blobs).toHaveLength(2);
    expect(firstPage.blobs[0].key).toBe("prefix/key1");
    expect(firstPage.blobs[1].key).toBe("prefix/key2");
    expect(firstPage.nextCursor).toBe("page1cursor");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob?prefix=prefix&limit=2",
      expect.any(Object),
    );

    // Mock second page response
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blobs: [
          {
            key: "prefix/key3",
            lastModified: "2024-01-01T00:00:00Z",
            size: 300,
          },
        ],
        nextCursor: null,
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const secondPage = await storage.listBlobs({
      prefix: "prefix",
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    });
    expect(secondPage.blobs).toHaveLength(1);
    expect(secondPage.blobs[0].key).toBe("prefix/key3");
    expect(secondPage.nextCursor).toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob?prefix=prefix&limit=2&cursor=page1cursor",
      expect.any(Object),
    );
  });

  test("should handle empty results with pagination", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blobs: [],
        nextCursor: null,
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const result = await storage.listBlobs({ limit: 10 });
    expect(result.blobs).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  test("should handle default limit in pagination", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");

    // Generate 100 mock blobs
    const mockBlobs = Array.from({ length: 100 }, (_, i) => ({
      key: `key${i + 1}`,
      lastModified: "2024-01-01T00:00:00Z",
      size: 100 * (i + 1),
    }));

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blobs: mockBlobs,
        nextCursor: "nextpage",
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const result = await storage.listBlobs();
    expect(result.blobs).toHaveLength(100); // Default limit
    expect(result.nextCursor).toBe("nextpage");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob?limit=100",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should delete a blob", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200, // common for successful delete
      json: async () => ({}), // For successful delete, body might be empty or not relevant
      text: async () => "",
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob("test-key");
    await blob.delete();

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob/test-key",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should check if a blob exists", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob("exists-key");
    const exists = await blob.exists();

    expect(exists).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob/exists-key",
      expect.objectContaining({
        method: "HEAD",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should put string to a blob", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const data = "Hello, remote world!";

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ etag: "mock-etag" }),
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob<string>("string-key");
    const result = await blob.putString(data);

    expect(result.etag).toBe("mock-etag");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob/string-key",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    // Verify the body contains the string content
    const [[, callOptions]] = fetchSpy.mock.calls;
    const body = JSON.parse(callOptions!.body as string);
    expect(body).toEqual({
      content: data,
      contentType: "text/plain",
    });
  });

  test("should get string from a blob", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const mockData = "Hello, world!";

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        content: mockData,
        etag: "mock-etag",
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob<string>("test-key");
    const result = await blob.getString();

    expect(result).toEqual(mockData);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob/test-key",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should get raw data from a blob", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const mockData = Buffer.from("Hello, world!");
    const base64Data = mockData.toString("base64");

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        content: base64Data,
        contentType: "application/octet-stream",
        etag: "mock-etag",
        lastModified: "2024-01-01T00:00:00Z",
        size: mockData.length,
        metadata: { isBase64: "true" },
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob<Buffer>("test-key");
    const result = await blob.getRaw();

    expect(result).toEqual({
      content: mockData,
      contentType: "application/octet-stream",
      etag: "mock-etag",
      lastModified: new Date("2024-01-01T00:00:00Z"),
      size: mockData.length,
      metadata: {},
    });
  });

  test("should get stream from a blob", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const mockData = "Hello, world!";

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      body: Readable.from(mockData),
      clone: function () {
        return this;
      }, // Note: Readable stream cloning is complex, this simple mock might not cover all edge cases if the code tried to clone the body multiple times for streaming.
    } as unknown as Response); // Cast needed because Readable.from(mockData) is not a standard Response body type.

    const blob = storage.getBlob<Readable>("test-key");
    const stream = await blob.getStream();

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    const result = Buffer.concat(chunks).toString();

    expect(result).toEqual(mockData);
  });

  test("should put raw data to a blob", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const data = Buffer.from("Hello, world!");

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ etag: "mock-etag" }),
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob<Buffer>("test-key");
    const result = await blob.putRaw(data, {
      contentType: "application/octet-stream",
      metadata: { test: "value" },
    });

    expect(result.etag).toBe("mock-etag");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob/test-key",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const [[, callOptions]] = fetchSpy.mock.calls;
    const body = JSON.parse(callOptions!.body as string);
    expect(body).toEqual({
      content: data.toString("base64"),
      contentType: "application/octet-stream",
      metadata: {
        test: "value",
        isBase64: "true",
      },
    });
  });

  test("should put stream to a blob", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const data = "Hello, world!";
    const stream = Readable.from(data);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ etag: "mock-etag" }),
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob<Readable>("test-key");
    const result = await blob.putStream(stream, {
      contentType: "text/plain",
      metadata: { test: "value" },
    });

    expect(result.etag).toBe("mock-etag");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob/test-key",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const [[, callOptions]] = fetchSpy.mock.calls;
    const body = JSON.parse(callOptions!.body as string);
    expect(body).toEqual({
      content: Buffer.from(data).toString("base64"),
      contentType: "text/plain",
      metadata: {
        test: "value",
        isBase64: "true",
      },
    });
  });

  test("should get blob metadata", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const _mockData = { foo: "bar" }; // Not directly used, but shows type context

    const headers = new Headers();
    headers.set("x-blob-meta-content-type", "application/json");
    headers.set("etag", "mock-etag");
    headers.set("x-blob-meta-test", "value");

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers,
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob<typeof _mockData>("test-key");
    const metadata = await blob.getMetadata();

    expect(metadata).toEqual({
      contentType: "application/json",
      etag: "mock-etag",
      test: "value",
    });
  });

  test("should update blob metadata", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200, // common for successful PATCH
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob("test-key");
    await blob.updateMetadata({ test: "value" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob/test-key",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({
          metadata: { test: "value" },
        }),
      }),
    );
  });

  suite("Error Handling (New)", () => {
    let storage: RemoteBlobStorage;

    beforeEach(() => {
      storage = new RemoteBlobStorage("test-project", "test-environment");
    });

    // Scenario 1: API returns error with JSON `error` field.
    test("Scenario 1: API returns error with JSON `error` field", async () => {
      const detailedErrorMessage = "Detailed API error from JSON";
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        clone: () => ({
          json: async () => ({ error: detailedErrorMessage }),
          text: async () => JSON.stringify({ error: detailedErrorMessage }),
        }),
      } as Response);

      const blob = storage.getBlob("test-key");
      try {
        await blob.getJSON();
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(BlobInternalError);
        expect((e as BlobInternalError).message).toContain(detailedErrorMessage);
        expect((e as BlobInternalError).message).toContain("(Status: 400)");
      }
    });

    // Scenario 2: API returns error with JSON body but NO `error` field.
    test("Scenario 2: API returns error with JSON body but NO `error` field", async () => {
      const errorBody = { message: "Some other JSON issue" };
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        clone: () => ({
          json: async () => errorBody,
          text: async () => JSON.stringify(errorBody),
        }),
      } as Response);

      const blob = storage.getBlob("test-key");
      try {
        await blob.getJSON();
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(BlobInternalError);
        expect((e as BlobInternalError).message).toContain(
          JSON.stringify(errorBody),
        );
        expect((e as BlobInternalError).message).toContain("(Status: 500)");
      }
    });

    // Scenario 3: API returns error with non-JSON text body.
    test("Scenario 3: API returns error with non-JSON text body", async () => {
      const plainTextMessage = "A plain text error from server";
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        clone: () => ({
          json: async () => {
            throw new Error("Not JSON");
          }, // Simulate JSON parse failure
          text: async () => plainTextMessage,
        }),
      } as Response);

      const blob = storage.getBlob("test-key");
      try {
        await blob.getJSON();
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(BlobInternalError);
        expect((e as BlobInternalError).message).toContain(plainTextMessage);
        expect((e as BlobInternalError).message).toContain("(Status: 403)");
      }
    });

    // Scenario 4: API returns error, and body parsing fails (fallback to statusText).
    test("Scenario 4: API returns error, body parsing fails (fallback to statusText)", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable",
        clone: () => ({
          json: async () => {
            throw new Error("Cannot parse JSON");
          },
          text: async () => {
            throw new Error("Cannot read text");
          }, // Or resolve to ""
        }),
      } as Response);

      const blob = storage.getBlob("test-key");
      try {
        await blob.getJSON();
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(BlobInternalError);
        expect((e as BlobInternalError).message).toContain(
          "Service Unavailable",
        );
        expect((e as BlobInternalError).message).toContain("(Status: 503)");
      }
    });

    // Scenario 5: Network Error (fetch throws).
    test("Scenario 5: Network Error (fetch throws)", async () => {
      const networkErrorMessage = "Network failure simulation";
      fetchSpy.mockRejectedValueOnce(new Error(networkErrorMessage));

      const blob = storage.getBlob("test-key");
      try {
        await blob.getJSON();
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(BlobNetworkError);
        expect((e as BlobNetworkError).message).toContain(
          "Network error during getJSON",
        ); // Adjusted to match new format
        expect((e as BlobNetworkError).message).toContain(networkErrorMessage);
        expect((e as BlobNetworkError).cause?.message).toBe(networkErrorMessage);
      }
    });

    // Scenario 6: Successful API call (getJSON).
    test("Scenario 6: Successful API call for getJSON", async () => {
      const mockData = { success: true };
      const mockStringContent = JSON.stringify(mockData);
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          content: mockStringContent,
          etag: "successful-etag",
        }),
        clone: function () {
          return this;
        },
      } as Response);

      const blob = storage.getBlob<typeof mockData>("test-key");
      const result = await blob.getJSON();
      expect(result).toEqual(mockData);
    });

    // Test for putJSON with ETag mismatch (BlobConflictError)
    test("should throw BlobConflictError for ETag mismatch (412)", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 412,
        statusText: "Precondition Failed",
        clone: () => ({
          json: async () => ({ error: "ETag does not match" }),
          text: async () => "ETag does not match",
        }),
      } as Response);

      const blob = storage.getBlob("test-key");
      try {
        await blob.putJSON({ data: "test" }, { etag: "old-etag" });
        expect.fail("Should have thrown BlobConflictError");
      } catch (e) {
        expect(e).toBeInstanceOf(BlobConflictError);
        expect((e as BlobConflictError).message).toContain("ETag mismatch");
         expect((e as BlobConflictError).message).toContain("(Status: 412)");
      }
    });
     // Test for putJSON missing ETag in response (BlobInternalError)
    test("should throw BlobInternalError if ETag is missing in putJSON response", async () => {
        fetchSpy.mockResolvedValueOnce({
            ok: true,
            status: 200,
            headers: new Headers(), // No ETag header
            json: async () => ({}), // Irrelevant for this specific error
            clone: function() { return this; }
        } as Response);

        const blob = storage.getBlob("test-key");
        try {
            await blob.putJSON({ data: "some data" });
            expect.fail("Should have thrown BlobInternalError for missing ETag");
        } catch (e) {
            expect(e).toBeInstanceOf(BlobInternalError);
            expect((e as BlobInternalError).message).toContain("No ETag returned from server after putting JSON blob");
        }
    });


    // Test for a different method, e.g., delete() for 404 (not an error)
    test("delete() should not throw for 404 response", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false, // ok is false for 404
        status: 404,
        statusText: "Not Found",
        clone: () => ({
          json: async () => ({}), // Should not be called by handleApiError for delete 404
          text: async () => "",
        }),
      } as Response);

      const blob = storage.getBlob("non-existent-key-for-delete");
      await expect(blob.delete()).resolves.toBeUndefined();
    });

    // Test for delete() with a non-404 error
    test("delete() should throw BlobInternalError for non-404 error", async () => {
      const errorMessage = "Failed due to server issue";
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        clone: () => ({
          json: async () => ({ error: errorMessage }),
          text: async () => errorMessage,
        }),
      } as Response);

      const blob = storage.getBlob("key-to-delete");
      try {
        await blob.delete();
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(BlobInternalError);
        expect((e as BlobInternalError).message).toContain(errorMessage);
        expect((e as BlobInternalError).message).toContain("(Status: 500)");
      }
    });
  });

  // Keep existing tests for default prefix and other functionalities, 
  // ensuring they use fetchSpy and are compatible with new setup.
  // Example:
  test("should handle default prefix in listBlobs (existing test adapted)", async () => {
    const storage = new RemoteBlobStorage(
      "test-project",
      "test-environment",
      "default-prefix",
    );
    const mockBlobs = [
      {
        key: "default-prefix/key1",
        lastModified: "2024-01-01T00:00:00Z",
        size: 100,
      },
      {
        key: "default-prefix/key2",
        lastModified: "2024-01-01T00:00:00Z",
        size: 200,
      },
    ];

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blobs: mockBlobs,
        nextCursor: null,
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const result = await storage.listBlobs();

    expect(result.blobs).toEqual([
      { key: "key1", lastModified: "2024-01-01T00:00:00Z", size: 100 },
      { key: "key2", lastModified: "2024-01-01T00:00:00Z", size: 200 },
    ]);
    expect(result.nextCursor).toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob?prefix=default-prefix&limit=100",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should combine default prefix with provided prefix in listBlobs", async () => {
    const storage = new RemoteBlobStorage(
      "test-project",
      "test-environment",
      "default-prefix",
    );
    const mockBlobs = [
      {
        key: "default-prefix/sub/key1",
        lastModified: "2024-01-01T00:00:00Z",
        size: 100,
      },
      {
        key: "default-prefix/sub/key2",
        lastModified: "2024-01-01T00:00:00Z",
        size: 200,
      },
    ];

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        blobs: mockBlobs,
        nextCursor: null,
      }),
      clone: function () {
        return this;
      },
    } as Response);

    const result = await storage.listBlobs({ prefix: "sub" });

    expect(result.blobs).toEqual([
      { key: "sub/key1", lastModified: "2024-01-01T00:00:00Z", size: 100 },
      { key: "sub/key2", lastModified: "2024-01-01T00:00:00Z", size: 200 },
    ]);
    expect(result.nextCursor).toBeNull();
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob?prefix=default-prefix%2Fsub&limit=100",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
        method: "GET",
      }),
    );
  });

  test("should handle content type in put operations", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const data = Buffer.from("Hello, world!");

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ etag: "mock-etag" }),
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob<Buffer>("test-key");
    const result = await blob.putRaw(data, {
      contentType: "application/octet-stream",
      metadata: { test: "value" },
    });

    expect(result.etag).toBe("mock-etag");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob/test-key",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const [[, callOptions]] = fetchSpy.mock.calls;
    const body = JSON.parse(callOptions!.body as string);
    expect(body).toEqual({
      content: data.toString("base64"),
      contentType: "application/octet-stream",
      metadata: {
        test: "value",
        isBase64: "true",
      },
    });
  });

  test("should handle stream operations with proper content type", async () => {
    const storage = new RemoteBlobStorage("test-project", "test-environment");
    const data = "Hello, world!";
    const stream = Readable.from(data);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      headers: new Headers({ etag: "mock-etag" }),
      clone: function () {
        return this;
      },
    } as Response);

    const blob = storage.getBlob<Readable>("test-key");
    const result = await blob.putStream(stream, {
      contentType: "text/plain",
      metadata: { test: "value" },
    });

    expect(result.etag).toBe("mock-etag");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/blob/test-key",
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const [[, callOptions]] = fetchSpy.mock.calls;
    const body = JSON.parse(callOptions!.body as string);
    expect(body).toEqual({
      content: Buffer.from(data).toString("base64"),
      contentType: "text/plain",
      metadata: {
        test: "value",
        isBase64: "true",
      },
    });
  });
});
