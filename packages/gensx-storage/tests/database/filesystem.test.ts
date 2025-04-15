import * as fs from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, beforeEach, expect, suite, test } from "vitest";

import { FileSystemDatabaseStorage } from "../../src/database/filesystem.js";
import {
  DatabaseConstraintError,
  DatabaseNotFoundError,
  DatabaseSyntaxError,
} from "../../src/database/types.js";

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

suite("FileSystemDatabaseStorage", () => {
  let tempDir: string;

  beforeEach(() => {
    return createTempDir().then((dir) => {
      tempDir = dir;
    });
  });

  afterEach(() => {
    return cleanupTempDir(tempDir);
  });

  test("should implement DatabaseStorage interface", () => {
    const storage = new FileSystemDatabaseStorage(tempDir);

    // Check interface implementation
    expect(storage).toBeDefined();
    expect(typeof storage.getDatabase).toBe("function");
    expect(typeof storage.listDatabases).toBe("function");
    expect(typeof storage.ensureDatabase).toBe("function");
    expect(typeof storage.deleteDatabase).toBe("function");
    expect(typeof storage.hasEnsuredDatabase).toBe("function");
  });

  test("should create and return database instances", () => {
    const storage = new FileSystemDatabaseStorage(tempDir);
    const db = storage.getDatabase("test");

    // Check that it returns a valid database
    expect(db).toBeDefined();
    expect(typeof db.execute).toBe("function");
    expect(typeof db.batch).toBe("function");
    expect(typeof db.executeMultiple).toBe("function");
    expect(typeof db.migrate).toBe("function");
    expect(typeof db.getInfo).toBe("function");
    expect(typeof db.close).toBe("function");
  });

  test("should return the same database instance for the same name", () => {
    const storage = new FileSystemDatabaseStorage(tempDir);
    const db1 = storage.getDatabase("test");
    const db2 = storage.getDatabase("test");

    expect(db1).toBe(db2);
  });

  test("should ensure database exists", async () => {
    const storage = new FileSystemDatabaseStorage(tempDir);

    // First call should create the database
    const result1 = await storage.ensureDatabase("test");
    expect(result1.created).toBe(true);
    expect(result1.exists).toBe(false);

    // Second call should not create it again
    const result2 = await storage.ensureDatabase("test");
    expect(result2.created).toBe(false);
    expect(result2.exists).toBe(true);

    // Check that the database file exists
    const dbPath = path.join(tempDir, "test.db");
    const exists = await fs
      .access(dbPath)
      .then(() => true)
      .catch(() => false);
    expect(exists).toBe(true);
  });

  test("should list databases", async () => {
    const storage = new FileSystemDatabaseStorage(tempDir);

    // Create some databases
    await storage.ensureDatabase("db1");
    await storage.ensureDatabase("db2");
    await storage.ensureDatabase("db3");

    // List should include all databases
    const databases = await storage.listDatabases();
    expect(databases).toContain("db1");
    expect(databases).toContain("db2");
    expect(databases).toContain("db3");
    expect(databases.length).toBe(3);
  });

  test("should handle non-existent directory in listDatabases", async () => {
    const nonExistentDir = path.join(tempDir, "non-existent");
    const storage = new FileSystemDatabaseStorage(nonExistentDir);

    const databases = await storage.listDatabases();
    expect(databases).toEqual([]);
  });

  test("should delete database", async () => {
    const storage = new FileSystemDatabaseStorage(tempDir);
    await storage.ensureDatabase("to-delete");

    // Check that it exists
    const dbPath = path.join(tempDir, "to-delete.db");
    expect(
      await fs
        .access(dbPath)
        .then(() => true)
        .catch(() => false),
    ).toBe(true);

    // Delete it
    const result = await storage.deleteDatabase("to-delete");
    expect(result.deleted).toBe(true);

    // Check that it's gone
    expect(
      await fs
        .access(dbPath)
        .then(() => true)
        .catch(() => false),
    ).toBe(false);
  });

  test("should handle deleting non-existent database", async () => {
    const storage = new FileSystemDatabaseStorage(tempDir);

    const result = await storage.deleteDatabase("non-existent");
    expect(result.deleted).toBe(false);
  });

  test("should track ensured databases", () => {
    const storage = new FileSystemDatabaseStorage(tempDir);

    // Not ensured initially
    expect(storage.hasEnsuredDatabase("test")).toBe(false);

    // Get database to ensure it exists in cache
    storage.getDatabase("test");

    // Now it should be ensured
    expect(storage.hasEnsuredDatabase("test")).toBe(true);
  });

  suite("Database Operations", () => {
    test("should execute SQL queries", async () => {
      const storage = new FileSystemDatabaseStorage(tempDir);
      await storage.ensureDatabase("test");
      const db = storage.getDatabase("test");

      // Create a table
      const createResult = await db.execute(
        "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT);",
      );
      expect(createResult.rowsAffected).toBe(0); // DDL statements don't affect rows

      // Insert data
      const insertResult = await db.execute(
        "INSERT INTO test_table (name) VALUES (?);",
        ["test-name"],
      );
      expect(insertResult.rowsAffected).toBe(1);
      expect(insertResult.lastInsertId).toBe(1);

      // Query data
      const queryResult = await db.execute("SELECT * FROM test_table;");
      expect(queryResult.columns).toEqual(["id", "name"]);
      expect(queryResult.rows.length).toBe(1);
      expect(queryResult.rows[0][0]).toBe(1); // id
      expect(queryResult.rows[0][1]).toBe("test-name"); // name
    });

    // test("should handle batch operations", async () => {
    //   try {
    //     const storage = new FileSystemDatabaseStorage(tempDir);
    //     await storage.ensureDatabase("test");
    //     const db = storage.getDatabase("test");

    //     // Create a table
    //     await db.execute(
    //       "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT);",
    //     );

    //     // Execute batch insert
    //     const batchResult = await db.batch([
    //       {
    //         sql: "INSERT INTO test_table (name) VALUES (?);",
    //         params: ["batch-1"],
    //       },
    //       {
    //         sql: "INSERT INTO test_table (name) VALUES (?);",
    //         params: ["batch-2"],
    //       },
    //       {
    //         sql: "INSERT INTO test_table (name) VALUES (?);",
    //         params: ["batch-3"],
    //       },
    //     ]);

    //     expect(batchResult.results.length).toBe(3);
    //     expect(batchResult.results[0].rowsAffected).toBe(1);
    //     expect(batchResult.results[1].rowsAffected).toBe(1);
    //     expect(batchResult.results[2].rowsAffected).toBe(1);

    //     // Check that all data was inserted
    //     const queryResult = await db.execute(
    //       "SELECT COUNT(*) FROM test_table;",
    //     );
    //     expect(queryResult.rows[0][0]).toBe(3);
    //   } catch (err) {
    //     console.error(err);
    //   }
    // });

    // test("should handle transaction rollback in batch operations", async () => {
    //   const storage = new FileSystemDatabaseStorage(tempDir);
    //   await storage.ensureDatabase("test");
    //   const db = storage.getDatabase("test");

    //   // Create a table with a unique constraint
    //   await db.execute(
    //     "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT UNIQUE);",
    //   );

    //   // Insert initial data
    //   await db.execute("INSERT INTO test_table (name) VALUES (?);", [
    //     "unique-name",
    //   ]);

    //   // Try batch with a statement that will fail due to unique constraint
    //   try {
    //     await db.batch([
    //       {
    //         sql: "INSERT INTO test_table (name) VALUES (?);",
    //         params: ["batch-1"],
    //       },
    //       {
    //         sql: "INSERT INTO test_table (name) VALUES (?);",
    //         params: ["unique-name"],
    //       }, // This will fail
    //       {
    //         sql: "INSERT INTO test_table (name) VALUES (?);",
    //         params: ["batch-3"],
    //       },
    //     ]);

    //     // Should have thrown
    //     expect(true).toBe(false);
    //   } catch (err) {
    //     expect(err).toBeInstanceOf(DatabaseConstraintError);
    //   }

    //   // Only the initial insert should be in the database due to transaction rollback
    //   const queryResult = await db.execute("SELECT COUNT(*) FROM test_table;");
    //   expect(queryResult.rows[0][0]).toBe(1);
    // });

    test("should execute multiple SQL statements", async () => {
      const storage = new FileSystemDatabaseStorage(tempDir);
      await storage.ensureDatabase("test");
      const db = storage.getDatabase("test");

      const sqlScript = `
        CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT);
        INSERT INTO test_table (name) VALUES ('stmt1');
        INSERT INTO test_table (name) VALUES ('stmt2');
      `;

      const result = await db.executeMultiple(sqlScript);

      expect(result.results.length).toBe(3);
      expect(result.results[0].rowsAffected).toBe(0); // CREATE TABLE
      expect(result.results[1].rowsAffected).toBe(1); // First INSERT
      expect(result.results[2].rowsAffected).toBe(1); // Second INSERT

      // Verify data was inserted
      const queryResult = await db.execute(
        "SELECT * FROM test_table ORDER BY id;",
      );
      expect(queryResult.rows.length).toBe(2);
      expect(queryResult.rows[0][1]).toBe("stmt1");
      expect(queryResult.rows[1][1]).toBe("stmt2");
    });

    test("should continue executing statements in executeMultiple even if one fails", async () => {
      const storage = new FileSystemDatabaseStorage(tempDir);
      await storage.ensureDatabase("test");
      const db = storage.getDatabase("test");

      const sqlScript = `
        CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT);
        INSERT INTO invalid_table (name) VALUES ('this will fail');
        INSERT INTO test_table (name) VALUES ('this should work');
      `;

      const result = await db.executeMultiple(sqlScript);

      // The second statement failed but the third one should have executed
      expect(result.results.length).toBe(3);
      expect(result.results[0].rowsAffected).toBe(0); // CREATE TABLE
      expect(result.results[1].rowsAffected).toBe(0); // Failed INSERT
      expect(result.results[2].rowsAffected).toBe(1); // Working INSERT

      // Verify table exists and data was inserted
      const queryResult = await db.execute("SELECT * FROM test_table;");
      expect(queryResult.rows.length).toBe(1);
      expect(queryResult.rows[0][1]).toBe("this should work");
    });

    test("should perform migrations with foreign keys disabled", async () => {
      const storage = new FileSystemDatabaseStorage(tempDir);
      await storage.ensureDatabase("test");
      const db = storage.getDatabase("test");

      const migrationScript = `
        CREATE TABLE parent (id INTEGER PRIMARY KEY, name TEXT);
        CREATE TABLE child (
          id INTEGER PRIMARY KEY,
          parent_id INTEGER,
          name TEXT,
          FOREIGN KEY (parent_id) REFERENCES parent(id)
        );

        -- Insert into child without parent (would fail with foreign keys enabled)
        INSERT INTO child (parent_id, name) VALUES (999, 'orphan');
      `;

      const result = await db.migrate(migrationScript);

      // Verify migration ran successfully
      expect(result.results.length).toBeGreaterThan(0);

      // Check that tables were created
      const tables = await db.execute(
        "SELECT name FROM sqlite_master WHERE type='table';",
      );
      expect(tables.rows.map((r) => r[0])).toContain("parent");
      expect(tables.rows.map((r) => r[0])).toContain("child");

      // Verify the orphan record was inserted despite violating foreign key constraint
      const orphans = await db.execute(
        "SELECT * FROM child WHERE parent_id = 999;",
      );
      expect(orphans.rows.length).toBe(1);

      // Verify that foreign keys are enabled again after migration
      const fkEnabled = await db.execute("PRAGMA foreign_keys;");
      expect(fkEnabled.rows[0][0]).toBe(1);
    });

    test("should get database info", async () => {
      const storage = new FileSystemDatabaseStorage(tempDir);
      await storage.ensureDatabase("test");
      const db = storage.getDatabase("test");

      // Create tables
      await db.execute(`
        CREATE TABLE test_table1 (
          id INTEGER PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT
        );
      `);
      await db.execute(`
        CREATE TABLE test_table2 (
          id INTEGER PRIMARY KEY,
          value REAL DEFAULT 0,
          is_active INTEGER
        );
      `);

      const info = await db.getInfo();

      expect(info.name).toBe("test");
      expect(info.size).toBeGreaterThan(0);
      expect(info.lastModified).toBeInstanceOf(Date);

      // Check tables info
      expect(info.tables.length).toBe(2);

      // Find test_table1
      const table1 = info.tables.find((t) => t.name === "test_table1");
      expect(table1).toBeDefined();
      if (table1) {
        expect(table1.columns.length).toBe(3);

        // Check id column
        const idCol = table1.columns.find((c) => c.name === "id");
        expect(idCol).toBeDefined();
        if (idCol) {
          expect(idCol.type).toBe("INTEGER");
          expect(idCol.primaryKey).toBe(true);
        }

        // Check name column
        const nameCol = table1.columns.find((c) => c.name === "name");
        expect(nameCol).toBeDefined();
        if (nameCol) {
          expect(nameCol.type).toBe("TEXT");
          expect(nameCol.notNull).toBe(true);
        }
      }

      // Find test_table2
      const table2 = info.tables.find((t) => t.name === "test_table2");
      expect(table2).toBeDefined();
      if (table2) {
        expect(table2.columns.length).toBe(3);

        // Check value column
        const valueCol = table2.columns.find((c) => c.name === "value");
        expect(valueCol).toBeDefined();
        if (valueCol) {
          expect(valueCol.type).toBe("REAL");
          expect(valueCol.defaultValue).toBe("0");
        }
      }
    });

    test("should handle empty database in getInfo", async () => {
      const storage = new FileSystemDatabaseStorage(tempDir);
      const db = storage.getDatabase("empty");

      const info = await db.getInfo();

      expect(info.name).toBe("empty");
      expect(info.size).toBe(0);
      expect(info.tables).toEqual([]);
    });
  });

  suite("Error Handling", () => {
    test("should throw DatabaseSyntaxError for SQL syntax errors", async () => {
      const storage = new FileSystemDatabaseStorage(tempDir);
      await storage.ensureDatabase("test");
      const db = storage.getDatabase("test");

      try {
        await db.execute("INVALID SQL QUERY;");
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(DatabaseSyntaxError);
      }
    });

    test("should throw DatabaseConstraintError for constraint violations", async () => {
      const storage = new FileSystemDatabaseStorage(tempDir);
      await storage.ensureDatabase("test");
      const db = storage.getDatabase("test");

      // Create table with unique constraint
      await db.execute(
        "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT UNIQUE);",
      );

      // Insert first record
      await db.execute("INSERT INTO test_table (name) VALUES (?);", [
        "unique-name",
      ]);

      // Try to insert duplicate
      try {
        await db.execute("INSERT INTO test_table (name) VALUES (?);", [
          "unique-name",
        ]);
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(DatabaseConstraintError);
      }
    });

    test("should throw DatabaseNotFoundError for non-existent databases", async () => {
      const storage = new FileSystemDatabaseStorage(tempDir);

      const nonExistentDb = "non-existent";

      // Try to execute a query on a non-existent database path
      const db = storage.getDatabase(nonExistentDb);

      try {
        // This should fail because the database file doesn't exist
        await db.execute("SELECT 1;");
      } catch (err) {
        expect(err).toBeInstanceOf(DatabaseNotFoundError);
      }
    });
  });
});
