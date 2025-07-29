# @gensx/storage

@gensx/storage provides runtime-provisioned cloud and local storage hooks for [GenSX](https://www.gensx.com/), supporting blobs, SQL databases, and search.

## Installation

```bash
npm install @gensx/storage
```

If you plan to use local databases when developing, install `@libsql/client` as a dev dependency:

```bash
npm install -d @libsql/client
```

## Features

- **Blob Storage**: Store and retrieve unstructured data like JSON, text, or binary data
- **Database Storage**: Create and query SQL databases
- **Search Storage**: Create and query vector search namespaces along with full text search

## Blob Storage

### Example

```tsx
import { Component } from "@gensx/core";
import { useBlob } from "@gensx/storage";

// Component that uses blob storage
const SaveData = Component("SaveData", async ({ data }: { data: string }) => {
  // Get a blob object for a specific key
  const blob = useBlob("my-data");

  // Save data to the blob
  await blob.putString(data);

  // Read the data back
  const result = await blob.getString();

  return `Data saved and retrieved: ${JSON.stringify(result?.data)}`;
});
```

### useBlob Configuration

The `useBlob` hook accepts configuration options to customize storage behavior:

```tsx
const blob = useBlob<MyDataType>("path/to/my-data", {
  // Storage type (defaults to "filesystem" in local runtime, "cloud" in cloud runtime)
  kind: "filesystem" | "cloud",

  // For filesystem storage
  rootDir: "/path/to/storage", // Root directory for storing blobs
  defaultPrefix: "optional-prefix", // Optional prefix for all blob keys
});
```

### Common Operations

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

The `BlobClient` can be used in native TypeScript/JavaScript code to manage blob storage programmatically. This is useful for scripts, migrations, or any non-component logic.

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
import { useDatabase } from "@gensx/storage";

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
```

### useDatabase Configuration

The `useDatabase` hook accepts configuration options to customize storage behavior:

```tsx
const db = await useDatabase("my-database", {
  // Storage type (defaults to "filesystem" in local runtime, "cloud" in cloud runtime)
  kind: "filesystem" | "cloud",

  // For filesystem storage
  rootDir: "/path/to/database-storage", // Root directory for storing databases
});
```

### Common Operations

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

The `DatabaseClient` can be used in native TypeScript/JavaScript code to manage SQL databases programmatically. This is useful for scripts, migrations, or any non-component logic.

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
import { useSearch } from "@gensx/storage";

// Component that uses vector search
const SearchVectors = Component<{ queryVector: number[] }, string>(
  "SearchVectors",
  async ({ queryVector }) => {
    // Get a search namespace (creates if not exists)
    const namespace = await useSearch("my-namespace");

    // Query for similar vectors
    const results = await namespace.query({
      rankBy: ["vector", "ANN", queryVector],
      topK: 3,
      includeAttributes: true,
    });

    return `Top results: ${JSON.stringify(results)}`;
  },
);
```

### Common Operations

```tsx
const namespace = await useSearch("my-namespace");

// Common operations
await namespace.write({ upsertRows: [...], distanceMetric: "cosine_distance" }); // Upsert vectors
await namespace.query({ rankBy: ["vector", "ANN", queryVector], topK: 5 }); // Query similar vectors
await namespace.getMetadata(); // Get namespace metadata
await namespace.getSchema(); // Get schema
await namespace.updateSchema({ schema: { ... } }); // Update schema
```

### SearchClient

The `SearchClient` can be used in native TypeScript/JavaScript code to manage vector search namespaces programmatically. This is useful for scripts, migrations, or any non-component logic.

```ts
import { SearchClient } from "@gensx/storage";

const client = new SearchClient();
const namespace = await client.getNamespace("my-namespace");
const results = await namespace.query({
  rankBy: ["vector", "ANN", queryVector],
  topK: 3,
});
```

## Troubleshooting

If you have `@libsql/client` installed as a standard dependency, it may cause issues for bundlers. You should typically install the package as a dev dependency as local databases are designed to be used during development.

If for some reason you need to use `@libsql/client` as a standard dependency, you can exclude it from client bundles. Add the following to your `next.config.ts` or `next.config.js` file:

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... other config options
  webpack: (config: any) => {
    // Ignore @libsql/client package for client-side builds
    config.resolve.alias = {
      ...config.resolve.alias,
      "@libsql/client": false,
    };
    return config;
  },
  // ... other config options
};

module.exports = nextConfig;
```

This configuration prevents bundling issues when `@libsql/client` is installed. If you only use cloud databases you can skip installing `@libsql/client` and omit this webpack rule.
