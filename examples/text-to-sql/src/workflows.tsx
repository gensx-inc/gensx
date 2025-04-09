import * as gensx from "@gensx/core";
import { DatabaseProvider, useDatabase } from "@gensx/storage";

const SQLQuery = gensx.Component<{}, string>("SQL", async () => {
  const db = await useDatabase("test");
  await db.execute(
    "CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)",
  );
  await db.execute("INSERT INTO test (name) VALUES (?)", ["Hello, world!"]);
  const result = await db.execute("SELECT * FROM test");
  console.log(result);
  return JSON.stringify(result);
});

// Main workflow component
const DatabaseWorkflowComponent = gensx.Component<{}, string>(
  "DatabaseWorkflowComponent",
  () => (
    <DatabaseProvider kind="cloud">
      <SQLQuery />
    </DatabaseProvider>
  ),
);

// Create the workflow
const DatabaseWorkflow = gensx.Workflow(
  "DatabaseWorkflow",
  DatabaseWorkflowComponent,
);

export { DatabaseWorkflow };
