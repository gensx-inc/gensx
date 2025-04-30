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
    expect(
      () => new RemoteDatabaseStorage("test-project", "test-environment"),
    ).not.toThrow();
  });

  test("should throw if API key is missing", () => {
    delete process.env.GENSX_API_KEY;
    expect(
      () => new RemoteDatabaseStorage("test-project", "test-environment"),
    ).toThrow("GENSX_API_KEY");
  });

  test("should throw if organization ID is missing", () => {
    delete process.env.GENSX_ORG;
    expect(
      () => new RemoteDatabaseStorage("test-project", "test-environment"),
    ).toThrow("Organization ID");
  });

  test("should execute SQL queries", async () => {
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );
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
      json: async () => mockResult,
    });

    const result = await db.execute("SELECT * FROM test_table");

    expect(result).toEqual(mockResult);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/database/test-db/execute",
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
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );
    const db = storage.getDatabase("test-db");

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        columns: ["id", "name"],
        rows: [[1, "test-name"]],
        rowsAffected: 0,
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
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );
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
      json: async () => mockBatchResult,
    });

    const statements = [
      { sql: "INSERT INTO test_table (name) VALUES (?)", params: ["batch-1"] },
      { sql: "INSERT INTO test_table (name) VALUES (?)", params: ["batch-2"] },
    ];
    const result = await db.batch(statements);

    expect(result).toEqual(mockBatchResult);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/database/test-db/batch",
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
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );
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
      json: async () => mockMultipleResult,
    });

    const sqlScript = `
      CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT);
      INSERT INTO test_table (name) VALUES ('test');
    `;
    const result = await db.executeMultiple(sqlScript);

    expect(result).toEqual(mockMultipleResult);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/database/test-db/multiple",
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
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );
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
      json: async () => mockMigrateResult,
    });

    const migrationScript = `
      CREATE TABLE IF NOT EXISTS migration_test (id INTEGER PRIMARY KEY, description TEXT);
      INSERT INTO migration_test (description) VALUES ('Test migration');
    `;
    const result = await db.migrate(migrationScript);

    expect(result).toEqual(mockMigrateResult);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/database/test-db/migrate",
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
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );
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
      json: async () => mockDbInfo,
    });

    const result = await db.getInfo();

    expect(result).toEqual({
      ...mockDbInfo,
      lastModified: new Date(mockLastModified),
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/database/test-db/info",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should list databases", async () => {
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        databases: [
          { name: "test-db1", createdAt: "2024-01-01T00:00:00.000Z" },
          { name: "test-db2", createdAt: "2024-01-02T00:00:00.000Z" },
        ],
        nextCursor: "next-page-token",
      }),
    });

    const result = await storage.listDatabases();

    expect(result.databases).toEqual([
      { name: "test-db1", createdAt: new Date("2024-01-01T00:00:00.000Z") },
      { name: "test-db2", createdAt: new Date("2024-01-02T00:00:00.000Z") },
    ]);
    expect(result.nextCursor).toBe("next-page-token");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/database",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should handle pagination in listDatabases", async () => {
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );

    // First page
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        databases: [
          { name: "db1", createdAt: "2024-01-01T00:00:00.000Z" },
          { name: "db2", createdAt: "2024-01-02T00:00:00.000Z" },
        ],
        nextCursor: "page2",
      }),
    });

    // Second page
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        databases: [
          { name: "db3", createdAt: "2024-01-03T00:00:00.000Z" },
          { name: "db4", createdAt: "2024-01-04T00:00:00.000Z" },
        ],
        nextCursor: undefined,
      }),
    });

    // Get first page
    const firstPage = await storage.listDatabases({ limit: 2 });
    expect(firstPage.databases).toEqual([
      { name: "db1", createdAt: new Date("2024-01-01T00:00:00.000Z") },
      { name: "db2", createdAt: new Date("2024-01-02T00:00:00.000Z") },
    ]);
    expect(firstPage.nextCursor).toBe("page2");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/database.*limit=2/),
      expect.any(Object),
    );

    // Get second page
    const secondPage = await storage.listDatabases({
      limit: 2,
      cursor: firstPage.nextCursor,
    });
    expect(secondPage.databases).toEqual([
      { name: "db3", createdAt: new Date("2024-01-03T00:00:00.000Z") },
      { name: "db4", createdAt: new Date("2024-01-04T00:00:00.000Z") },
    ]);
    expect(secondPage.nextCursor).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/database.*limit=2.*cursor=page2/),
      expect.any(Object),
    );
  });

  test("should handle empty results in listDatabases", async () => {
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        databases: [],
        nextCursor: undefined,
      }),
    });

    const result = await storage.listDatabases({ limit: 10 });

    expect(result.databases).toEqual([]);
    expect(result.nextCursor).toBeUndefined();
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringMatching(/database.*limit=10/),
      expect.any(Object),
    );
  });

  test("should ensure database exists", async () => {
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ exists: true, created: true }),
    });

    const result = await storage.ensureDatabase("new-db");

    expect(result).toEqual({ exists: true, created: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/database/new-db/ensure",
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
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ deleted: true }),
    });

    const result = await storage.deleteDatabase("old-db");

    expect(result).toEqual({ deleted: true });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.gensx.com/org/test-org/projects/test-project/environments/test-environment/database/old-db",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer test-api-key",
        }),
      }),
    );
  });

  test("should check if database has been ensured", () => {
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );

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

      const storage = new RemoteDatabaseStorage(
        "test-project",
        "test-environment",
      );
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
        ok: false,
        status: 400,
        statusText: "Bad Request",
      });

      const storage = new RemoteDatabaseStorage(
        "test-project",
        "test-environment",
      );
      const db = storage.getDatabase("api-error");

      try {
        await db.execute("SELECT * FROM test_table");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(DatabaseInternalError);
        expect((err as DatabaseError).code).toBe("INTERNAL_ERROR");
        expect((err as DatabaseError).message).toContain("Bad Request");
      }
    });

    test("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const storage = new RemoteDatabaseStorage(
        "test-project",
        "test-environment",
      );
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
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      const storage = new RemoteDatabaseStorage(
        "test-project",
        "test-environment",
      );
      const db = storage.getDatabase("missing-data");

      try {
        await db.execute("SELECT * FROM test_table");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(DatabaseInternalError);
        expect((err as DatabaseError).code).toBe("INTERNAL_ERROR");
        expect((err as DatabaseError).message).toContain("Not Found");
      }
    });
  });

  test("database close method should be a no-op for remote database", () => {
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );
    const db = storage.getDatabase("test-db");

    // Should not throw
    expect(() => {
      db.close();
    }).not.toThrow();
  });

  test("should handle URL encoding of database names", async () => {
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );

    // Database name with special characters
    const dbName = "test/db with spaces";
    const db = storage.getDatabase(dbName);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        columns: [],
        rows: [],
        rowsAffected: 0,
      }),
    });

    await db.execute("SELECT 1");

    // Check that URL has encoded database name
    const url = mockFetch.mock.calls[0][0];
    expect(url).toContain("test%2Fdb%20with%20spaces");
  });
});
