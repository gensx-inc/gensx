/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/require-await */

import { afterEach, beforeEach, expect, suite, test, vi } from "vitest";

import { RemoteDatabaseStorage } from "../../src/database/remote.js";
import {
  DatabaseError,
  DatabaseInternalError,
  DatabaseNetworkError,
} from "../../src/database/types.js";

suite("RemoteDatabaseStorage", () => {
  // Save original environment
  const originalEnv = { ...process.env };
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Setup mock environment variables
    process.env.GENSX_API_KEY = "test-api-key";
    process.env.GENSX_ORG = "test-org";

    // Reset and setup fetch mock
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(async () => {
    // Restore original environment
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  test("should initialize with environment variables", () => {
    expect(() => new RemoteDatabaseStorage()).not.toThrow();
  });

  test("should throw if API key is missing", () => {
    delete process.env.GENSX_API_KEY;
    expect(() => new RemoteDatabaseStorage()).toThrow("GENSX_API_KEY");
  });

  test("should throw if organization ID is missing", () => {
    delete process.env.GENSX_ORG;
    expect(() => new RemoteDatabaseStorage()).toThrow("Organization ID");
  });

  test("should execute SQL queries", async () => {
    const storage = new RemoteDatabaseStorage();
    const db = storage.getDatabase("test-db");

    const mockResult = {
      columns: ["id", "name"],
      rows: [[1, "test-name"]],
      rowsAffected: 0,
      lastInsertId: undefined,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: mockResult,
      }),
    });

    const result = await db.execute("SELECT * FROM test_table");

    expect(result).toEqual(mockResult);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/database/test-db/execute",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      sql: "SELECT * FROM test_table",
      params: undefined,
    });
  });

  test("should execute SQL queries with parameters", async () => {
    const storage = new RemoteDatabaseStorage();
    const db = storage.getDatabase("test-db");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: {
          columns: ["id", "name"],
          rows: [[1, "test-name"]],
          rowsAffected: 0,
        },
      }),
    });

    await db.execute("SELECT * FROM test_table WHERE name = ?", ["test-name"]);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({
      sql: "SELECT * FROM test_table WHERE name = ?",
      params: ["test-name"],
    });
  });

  test("should execute batch operations", async () => {
    const storage = new RemoteDatabaseStorage();
    const db = storage.getDatabase("test-db");

    const mockBatchResult = {
      results: [
        { columns: [], rows: [], rowsAffected: 1 },
        { columns: [], rows: [], rowsAffected: 1 },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: mockBatchResult,
      }),
    });

    const statements = [
      { sql: "INSERT INTO test_table (name) VALUES (?)", params: ["batch-1"] },
      { sql: "INSERT INTO test_table (name) VALUES (?)", params: ["batch-2"] },
    ];
    const result = await db.batch(statements);

    expect(result).toEqual(mockBatchResult);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/database/test-db/batch",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ statements });
  });

  test("should execute multiple SQL statements", async () => {
    const storage = new RemoteDatabaseStorage();
    const db = storage.getDatabase("test-db");

    const mockMultipleResult = {
      results: [
        { columns: [], rows: [], rowsAffected: 0 },
        { columns: [], rows: [], rowsAffected: 1 },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: mockMultipleResult,
      }),
    });

    const sqlScript = `
      CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT);
      INSERT INTO test_table (name) VALUES ('test');
    `;
    const result = await db.executeMultiple(sqlScript);

    expect(result).toEqual(mockMultipleResult);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/database/test-db/multiple",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ sql: sqlScript });
  });

  test("should execute migrations", async () => {
    const storage = new RemoteDatabaseStorage();
    const db = storage.getDatabase("test-db");

    const mockMigrateResult = {
      results: [
        { columns: [], rows: [], rowsAffected: 0 },
        { columns: [], rows: [], rowsAffected: 0 },
        { columns: [], rows: [], rowsAffected: 1 },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: mockMigrateResult,
      }),
    });

    const migrationScript = `
      CREATE TABLE IF NOT EXISTS migration_test (id INTEGER PRIMARY KEY, description TEXT);
      INSERT INTO migration_test (description) VALUES ('Test migration');
    `;
    const result = await db.migrate(migrationScript);

    expect(result).toEqual(mockMigrateResult);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/database/test-db/migrate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        }),
        body: expect.any(String),
      }),
    );

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body).toEqual({ sql: migrationScript });
  });

  test("should get database info", async () => {
    const storage = new RemoteDatabaseStorage();
    const db = storage.getDatabase("test-db");

    const mockLastModified = new Date().toISOString();
    const mockDbInfo = {
      name: "test-db",
      size: 1024,
      lastModified: mockLastModified,
      tables: [
        {
          name: "test_table",
          columns: [
            { name: "id", type: "INTEGER", notNull: true, primaryKey: true },
            { name: "name", type: "TEXT", notNull: false, primaryKey: false },
          ],
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: mockDbInfo,
      }),
    });

    const result = await db.getInfo();

    expect(result).toEqual({
      ...mockDbInfo,
      lastModified: new Date(mockLastModified),
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/database/test-db/info",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should list databases", async () => {
    const storage = new RemoteDatabaseStorage();
    const mockDatabases = ["db1", "db2", "db3"];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: { databases: mockDatabases },
      }),
    });

    const result = await storage.listDatabases();

    expect(result).toEqual(mockDatabases);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/database",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should ensure database exists", async () => {
    const storage = new RemoteDatabaseStorage();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: { exists: true, created: true },
      }),
    });

    const result = await storage.ensureDatabase("new-db");

    expect(result).toEqual({ exists: true, created: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/database/new-db/ensure",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  test("should delete database", async () => {
    const storage = new RemoteDatabaseStorage();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: { deleted: true },
      }),
    });

    const result = await storage.deleteDatabase("old-db");

    expect(result).toEqual({ deleted: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/database/old-db",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should check if database has been ensured", () => {
    const storage = new RemoteDatabaseStorage();

    // Not ensured initially
    expect(storage.hasEnsuredDatabase("test-db")).toBe(false);

    // Get database to ensure it exists in cache
    storage.getDatabase("test-db");

    // Now it should be ensured
    expect(storage.hasEnsuredDatabase("test-db")).toBe(true);
  });

  suite("Error Handling", () => {
    test("should handle HTTP error status codes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      });

      const storage = new RemoteDatabaseStorage();
      const db = storage.getDatabase("error-db");

      try {
        await db.execute("SELECT * FROM test_table");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(DatabaseInternalError);
        expect((err as DatabaseError).code).toBe("INTERNAL_ERROR");
      }
    });

    test("should handle API error responses", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "error",
          error: "API error message",
        }),
      });

      const storage = new RemoteDatabaseStorage();
      const db = storage.getDatabase("api-error");

      try {
        await db.execute("SELECT * FROM test_table");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(DatabaseInternalError);
        expect((err as DatabaseError).code).toBe("INTERNAL_ERROR");
        expect((err as DatabaseError).message).toContain("API error");
      }
    });

    test("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const storage = new RemoteDatabaseStorage();
      const db = storage.getDatabase("network-error");

      try {
        await db.execute("SELECT * FROM test_table");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(DatabaseNetworkError);
        expect((err as DatabaseError).code).toBe("NETWORK_ERROR");
        expect((err as DatabaseError).message).toContain("Network failure");
      }
    });

    test("should handle missing data in API response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          status: "ok",
          // No data field
        }),
      });

      const storage = new RemoteDatabaseStorage();
      const db = storage.getDatabase("missing-data");

      try {
        await db.execute("SELECT * FROM test_table");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(DatabaseInternalError);
        expect((err as DatabaseError).code).toBe("INTERNAL_ERROR");
        expect((err as DatabaseError).message).toContain("No data returned");
      }
    });
  });

  test("database close method should be a no-op for remote database", () => {
    const storage = new RemoteDatabaseStorage();
    const db = storage.getDatabase("test-db");

    // Should not throw
    expect(() => {
      db.close();
    }).not.toThrow();
  });

  test("should handle URL encoding of database names", async () => {
    const storage = new RemoteDatabaseStorage();

    // Database name with special characters
    const dbName = "test/db with spaces";
    const db = storage.getDatabase(dbName);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        status: "ok",
        data: {
          columns: [],
          rows: [],
          rowsAffected: 0,
        },
      }),
    });

    await db.execute("SELECT 1");

    // Check that URL has encoded database name
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("test%2Fdb%20with%20spaces");
  });
});
