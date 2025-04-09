import * as gensx from "@gensx/core";
import { SQLiteProvider, useSQLite } from "@gensx/storage";

const SQLiteQuery = gensx.Component<{}, string>("SQLite", async () => {
  const db = await useSQLite("test");
  await db.execute(
    "CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)",
  );
  await db.execute("INSERT INTO test (name) VALUES (?)", ["Hello, world!"]);
  const result = await db.execute("SELECT * FROM test");
  console.log(result);
  return JSON.stringify(result);
});

// Main workflow component
const SQLiteWorkflowComponent = gensx.Component<{}, string>(
  "SQLiteWorkflowComponent",
  () => (
    <SQLiteProvider kind="cloud">
      <SQLiteQuery />
    </SQLiteProvider>
  ),
);

// Create the workflow
const SQLiteWorkflow = gensx.Workflow(
  "SQLiteWorkflow",
  SQLiteWorkflowComponent,
);

export { SQLiteWorkflow };
