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
    vi.restoreAllMocks();
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

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResult,
      clone: function () { return this; }
    } as Response);

    const result = await db.execute("SELECT * FROM test_table");

    expect(result).toEqual(mockResult);
    expect(fetchSpy).toHaveBeenCalledWith(
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

    const [[, callOptionsExecute]] = fetchSpy.mock.calls;
    const bodyExecute = JSON.parse(callOptionsExecute!.body as string);
    expect(bodyExecute).toEqual({
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

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        columns: ["id", "name"],
        rows: [[1, "test-name"]],
        rowsAffected: 0,
      }),
      clone: function () { return this; }
    } as Response);

    await db.execute("SELECT * FROM test_table WHERE name = ?", ["test-name"]);

    const [[, callOptionsParams]] = fetchSpy.mock.calls;
    const bodyParams = JSON.parse(callOptionsParams!.body as string);
    expect(bodyParams).toEqual({
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

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockBatchResult,
      clone: function () { return this; }
    } as Response);

    const statements = [
      { sql: "INSERT INTO test_table (name) VALUES (?)", params: ["batch-1"] },
      { sql: "INSERT INTO test_table (name) VALUES (?)", params: ["batch-2"] },
    ];
    const result = await db.batch(statements);

    expect(result).toEqual(mockBatchResult);
    expect(fetchSpy).toHaveBeenCalledWith(
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

    const [[, callOptionsBatch]] = fetchSpy.mock.calls;
    const bodyBatch = JSON.parse(callOptionsBatch!.body as string);
    expect(bodyBatch).toEqual({ statements });
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

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockMultipleResult,
      clone: function () { return this; }
    } as Response);

    const sqlScript = `
      CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, name TEXT);
      INSERT INTO test_table (name) VALUES ('test');
    `;
    const result = await db.executeMultiple(sqlScript);

    expect(result).toEqual(mockMultipleResult);
    expect(fetchSpy).toHaveBeenCalledWith(
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

    const [[, callOptionsMultiple]] = fetchSpy.mock.calls;
    const bodyMultiple = JSON.parse(callOptionsMultiple!.body as string);
    expect(bodyMultiple).toEqual({ sql: sqlScript });
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

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockMigrateResult,
      clone: function () { return this; }
    } as Response);

    const migrationScript = `
      CREATE TABLE IF NOT EXISTS migration_test (id INTEGER PRIMARY KEY, description TEXT);
      INSERT INTO migration_test (description) VALUES ('Test migration');
    `;
    const result = await db.migrate(migrationScript);

    expect(result).toEqual(mockMigrateResult);
    expect(fetchSpy).toHaveBeenCalledWith(
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

    const [[, callOptionsMigrate]] = fetchSpy.mock.calls;
    const bodyMigrate = JSON.parse(callOptionsMigrate!.body as string);
    expect(bodyMigrate).toEqual({ sql: migrationScript });
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

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockDbInfo,
      clone: function () { return this; }
    } as Response);

    const result = await db.getInfo();

    expect(result).toEqual({
      ...mockDbInfo,
      lastModified: new Date(mockLastModified),
    });
    expect(fetchSpy).toHaveBeenCalledWith(
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

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        databases: [
          { name: "test-db1", createdAt: "2024-01-01T00:00:00.000Z" },
          { name: "test-db2", createdAt: "2024-01-02T00:00:00.000Z" },
        ],
        nextCursor: "next-page-token",
      }),
      clone: function () { return this; }
    } as Response);

    const result = await storage.listDatabases();

    expect(result.databases).toEqual([
      { name: "test-db1", createdAt: new Date("2024-01-01T00:00:00.000Z") },
      { name: "test-db2", createdAt: new Date("2024-01-02T00:00:00.000Z") },
    ]);
    expect(result.nextCursor).toBe("next-page-token");
    expect(fetchSpy).toHaveBeenCalledWith(
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
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        databases: [
          { name: "db1", createdAt: "2024-01-01T00:00:00.000Z" },
          { name: "db2", createdAt: "2024-01-02T00:00:00.000Z" },
        ],
        nextCursor: "page2",
      }),
      clone: function () { return this; }
    } as Response);

    // Second page
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        databases: [
          { name: "db3", createdAt: "2024-01-03T00:00:00.000Z" },
          { name: "db4", createdAt: "2024-01-04T00:00:00.000Z" },
        ],
        nextCursor: undefined,
      }),
      clone: function () { return this; }
    } as Response);

    // Get first page
    const firstPage = await storage.listDatabases({ limit: 2 });
    expect(firstPage.databases).toEqual([
      { name: "db1", createdAt: new Date("2024-01-01T00:00:00.000Z") },
      { name: "db2", createdAt: new Date("2024-01-02T00:00:00.000Z") },
    ]);
    expect(firstPage.nextCursor).toBe("page2");
    expect(fetchSpy).toHaveBeenCalledWith(
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
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/database.*limit=2.*cursor=page2/),
      expect.any(Object),
    );
  });

  test("should handle empty results in listDatabases", async () => {
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        databases: [],
        nextCursor: undefined,
      }),
      clone: function () { return this; }
    } as Response);

    const result = await storage.listDatabases({ limit: 10 });

    expect(result.databases).toEqual([]);
    expect(result.nextCursor).toBeUndefined();
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/database.*limit=10/),
      expect.any(Object),
    );
  });

  test("should ensure database exists", async () => {
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ exists: true, created: true }),
      clone: function () { return this; }
    } as Response);

    const result = await storage.ensureDatabase("new-db");

    expect(result).toEqual({ exists: true, created: true });
    expect(fetchSpy).toHaveBeenCalledWith(
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

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ deleted: true }),
      clone: function () { return this; }
    } as Response);

    const result = await storage.deleteDatabase("old-db");

    expect(result).toEqual({ deleted: true });
    expect(fetchSpy).toHaveBeenCalledWith(
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

  suite("Error Handling (New)", () => {
    let storage: RemoteDatabaseStorage;
    let db: ReturnType<RemoteDatabaseStorage["getDatabase"]>;

    beforeEach(() => {
      storage = new RemoteDatabaseStorage("test-project", "test-environment");
      db = storage.getDatabase("test-db");
    });

    // Scenario 1: API returns error with JSON `error` field.
    test("Scenario 1: API returns error with JSON `error` field", async () => {
      const detailedErrorMessage = "Detailed DB error from JSON";
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
        await db.execute("SELECT 1");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DatabaseInternalError);
        expect((e as DatabaseInternalError).message).toContain(detailedErrorMessage);
        expect((e as DatabaseInternalError).message).toContain("(Status: 400)");
      }
    });

    // Scenario 2: API returns error with JSON body but NO `error` field.
    test("Scenario 2: API returns error with JSON body but NO `error` field", async () => {
      const errorBody = { message: "Some other DB JSON issue" };
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
        await db.execute("SELECT 1");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DatabaseInternalError);
        expect((e as DatabaseInternalError).message).toContain(JSON.stringify(errorBody));
        expect((e as DatabaseInternalError).message).toContain("(Status: 500)");
      }
    });

    // Scenario 3: API returns error with non-JSON text body.
    test("Scenario 3: API returns error with non-JSON text body", async () => {
      const plainTextMessage = "A plain text DB error from server";
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
        await db.execute("SELECT 1");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DatabaseInternalError);
        expect((e as DatabaseInternalError).message).toContain(plainTextMessage);
        expect((e as DatabaseInternalError).message).toContain("(Status: 403)");
      }
    });

    // Scenario 4: API returns error, and body parsing fails (fallback to statusText).
    test("Scenario 4: API returns error, body parsing fails (fallback to statusText)", async () => {
      fetchSpy.mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Service Unavailable DB",
        clone: () => ({
          json: async () => { throw new Error("Cannot parse JSON"); },
          text: async () => { throw new Error("Cannot read text"); },
        }),
      } as Response);

      try {
        await db.execute("SELECT 1");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DatabaseInternalError);
        expect((e as DatabaseInternalError).message).toContain("Service Unavailable DB");
        expect((e as DatabaseInternalError).message).toContain("(Status: 503)");
      }
    });

    // Scenario 5: Network Error (fetch throws).
    test("Scenario 5: Network Error (fetch throws)", async () => {
      const networkErrorMessage = "DB Network failure simulation";
      fetchSpy.mockRejectedValueOnce(new Error(networkErrorMessage));

      try {
        await db.execute("SELECT 1");
        expect.fail("Should have thrown");
      } catch (e) {
        expect(e).toBeInstanceOf(DatabaseNetworkError);
        expect((e as DatabaseNetworkError).message).toContain("Network error during execute");
        expect((e as DatabaseNetworkError).message).toContain(networkErrorMessage);
        expect((e as DatabaseNetworkError).cause?.message).toBe(networkErrorMessage);
      }
    });

    // Scenario 6: Successful API call (execute).
    test("Scenario 6: Successful API call for execute", async () => {
      const mockResult = { columns: ["res"], rows: [[1]], rowsAffected: 0 };
      fetchSpy.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResult,
        clone: function () { return this; }
      } as Response);
      
      const result = await db.execute("SELECT 1");
      expect(result).toEqual(mockResult);
    });
  });

  test("database close method should be a no-op for remote database (existing test)", () => {
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

  test("should handle URL encoding of database names (existing test adapted)", async () => {
    const storage = new RemoteDatabaseStorage(
      "test-project",
      "test-environment",
    );

    // Database name with special characters
    const dbName = "test/db with spaces";
    const db = storage.getDatabase(dbName);

    fetchSpy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        columns: [],
        rows: [],
        rowsAffected: 0,
      }),
      clone: function () { return this; }
    } as Response);

    await db.execute("SELECT 1");

    // Check that URL has encoded database name
    const [[url]] = fetchSpy.mock.calls;
    expect(url).toContain("test%2Fdb%20with%20spaces");
  });
});
