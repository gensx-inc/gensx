# @gensx/storage

@gensx/storage provides runtime-provisioned cloud and local storage hooks for [GenSX](https://www.gensx.com/), supporting blobs, SQL databases, and search.

## Installation

```bash
npm install @gensx/storage
```

## Features

- **Blob Storage**: Store and retrieve unstructured data like JSON, text, or binary data
- **Database Storage**: Create and query SQL databases
- **Search Storage** : Create and query vector search namespaces along with full text search

## Blob Storage

### Example

```tsx
import { Component } from "@gensx/core";
import { BlobProvider, useBlob } from "@gensx/storage";

// Component that uses blob storage
const SaveData = Component<{ data: string }, string>(
  "SaveData",
  async ({ data }) => {
    // Get a blob object for a specific key
    const blob = useBlob("my-data");

    // Save data to the blob
    await blob.putString(data);

    // Read the data back
    const result = await blob.getString();

    return `Data saved and retrieved: ${JSON.stringify(result?.data)}`;
  },
);

// Main workflow component
export const MyWorkflow = Component<{ input: string }, string>(
  "MyWorkflow",
  ({ input }) => (
    // Use local filesystem storage
    <BlobProvider kind="filesystem" rootDir="/tmp/storage">
      <SaveData data={input} />
    </BlobProvider>

    // Alternatively, use cloud storage (requires GENSX_API_KEY and GENSX_ORG)
    // <BlobProvider kind="cloud">
    //   <SaveData data={input} />
    // </BlobProvider>
  ),
);
```

### BlobProvider

Provides blob storage to its children. Can be configured for local filesystem or cloud storage.

```tsx
// Local filesystem storage
<BlobProvider
  kind="filesystem"
  rootDir="/path/to/storage"
  defaultPrefix="optional-prefix"
>
  {children}
</BlobProvider>

// Cloud storage (using GenSX APIs)
<BlobProvider
  kind="cloud"
  defaultPrefix="optional-prefix"
  organizationId="optional-override"
>
  {children}
</BlobProvider>
```

### useBlob

Hook to access a blob by key.

```tsx
const blob = useBlob<MyDataType>("path/to/my-data");

// Common operations
await blob.getString(); // Get data
await blob.putString(data); // Store data

await blob.putJSON(data); // Store data
await blob.getJSON(); // Get data

await blob.putRaw(data); // Store data
await blob.getRaw(); // Get data

await blob.putStream(data); // Store data
await blob.getStream(); // Get data

await blob.delete(); // Delete data
await blob.exists(); // Check if exists
await blob.getMetadata(); // Get metadata

await blob.updateMetadata({ key: "value" }); // Update metadata
```

### BlobClient

The `BlobClient` can be used in native TypeScript/JavaScript code (outside of JSX) to manage blob storage programmatically. This is useful for scripts, migrations, or any non-component logic.

```ts
import { BlobClient } from "@gensx/storage";

const client = new BlobClient({ kind: "filesystem", rootDir: "/tmp/storage" });
const blob = client.getBlob("my-data");
await blob.putString("hello world");
const value = await blob.getString();
```

## Database Storage

### Example

```tsx
import { Component } from "@gensx/core";
import { DatabaseProvider, useDatabase } from "@gensx/storage";

// Component that uses a database
const SaveToDatabase = Component<
  { input: { name: string; age: number } },
  string
>("SaveToDatabase", async ({ input }) => {
  // Get a database instance (creates if not exists)
  const db = await useDatabase("my-database");

  // Create a table if it doesn't exist
  await db.execute("CREATE TABLE IF NOT EXISTS users (name TEXT, age INTEGER)");

  // Insert data
  await db.execute("INSERT INTO users (name, age) VALUES (?, ?)", [
    input.name,
    input.age,
  ]);

  // Query data
  const result = await db.execute("SELECT * FROM users");

  return `Users: ${JSON.stringify(result.rows)}`;
});

// Main workflow component
export const MyDatabaseWorkflow = Component<
  { input: { name: string; age: number } },
  string
>("MyDatabaseWorkflow", ({ input }) => (
  // Use local filesystem storage
  <DatabaseProvider kind="filesystem" rootDir="/tmp/database-storage">
    <SaveToDatabase input={input} />
  </DatabaseProvider>

  // Alternatively, use cloud storage (requires GENSX_API_KEY and GENSX_ORG)
  // <DatabaseProvider kind="cloud">
  //   <SaveToDatabase input={input} />
  // </DatabaseProvider>
));
```

### DatabaseProvider

Provides SQL database storage to its children. Can be configured for local filesystem or cloud storage.

```tsx
// Local filesystem storage
<DatabaseProvider
  kind="filesystem"
  rootDir="/path/to/database-storage"
>
  {children}
</DatabaseProvider>

// Cloud storage (using GenSX APIs)
<DatabaseProvider kind="cloud">
  {children}
</DatabaseProvider>
```

### useDatabase

Hook to access a database by name.

```tsx
const db = await useDatabase("my-database");

// Common operations
await db.execute("CREATE TABLE IF NOT EXISTS ..."); // Create table
await db.execute("INSERT INTO ..."); // Insert data
const result = await db.execute("SELECT * FROM ..."); // Query data
await db.batch([...]); // Batch operations
await db.executeMultiple("...;"); // Run multiple statements
await db.migrate("...;"); // Run migrations
await db.getInfo(); // Get database info
await db.close(); // Close connection
```

### DatabaseClient

The `DatabaseClient` can be used in native TypeScript/JavaScript code (outside of JSX) to manage SQL databases programmatically. This is useful for scripts, migrations, or any non-component logic.

```ts
import { DatabaseClient } from "@gensx/storage";

const client = new DatabaseClient({
  kind: "filesystem",
  rootDir: "/tmp/database-storage",
});
const db = await client.getDatabase("my-database");
await db.execute("CREATE TABLE IF NOT EXISTS users (name TEXT, age INTEGER)");
```

## Search Storage

### Example

```tsx
import { Component } from "@gensx/core";
import { SearchProvider, useSearch } from "@gensx/storage";

// Component that uses vector search
const SearchVectors = Component<{ queryVector: number[] }, string>(
  "SearchVectors",
  async ({ queryVector }) => {
    // Get a search namespace (creates if not exists)
    const namespace = await useSearch("my-namespace");

    // Query for similar vectors
    const results = await namespace.query({
      vector: queryVector,
      topK: 3,
      includeAttributes: true,
    });

    return `Top results: ${JSON.stringify(results)}`;
  },
);

// Main workflow component
export const MySearchWorkflow = Component<{ queryVector: number[] }, string>(
  "MySearchWorkflow",
  ({ queryVector }) => (
    // Use cloud search (requires GENSX_API_KEY and GENSX_ORG)
    <SearchProvider>
      <SearchVectors queryVector={queryVector} />
    </SearchProvider>
  ),
);
```

### SearchProvider

Provides vector search storage to its children. Unlike blob and database storage, search storage is cloud-only.

```tsx
<SearchProvider>{children}</SearchProvider>
```

### useSearch

Hook to access a vector search namespace by name.

```tsx
const namespace = await useSearch("my-namespace");

// Common operations
await namespace.upsert({ vectors, distanceMetric: "cosine" }); // Upsert vectors
await namespace.query({ vector, topK: 5 }); // Query similar vectors
await namespace.delete({ ids: ["id1", "id2"] }); // Delete vectors by ID
await namespace.deleteByFilter({ filters: { ... } }); // Delete by filter
await namespace.getMetadata(); // Get namespace metadata
await namespace.getSchema(); // Get schema
await namespace.updateSchema({ schema: { ... } }); // Update schema
```

### SearchClient

The `SearchClient` can be used in native TypeScript/JavaScript code (outside of JSX) to manage vector search namespaces programmatically. This is useful for scripts, migrations, or any non-component logic.

```ts
import { SearchClient } from "@gensx/storage";

const client = new SearchClient();
const namespace = await client.getNamespace("my-namespace");
const results = await namespace.query({ vector: [0.1, 0.2, 0.3], topK: 3 });
```
