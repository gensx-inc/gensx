# @gensx/storage

Runtime-provisioned cloud data storage hooks for GenSX.

## Installation

```bash
npm install @gensx/storage
```

## Features

- **Blob Storage**: Store and retrieve unstructured data like JSON, text, or binary data
- **SQLite Storage** (coming soon): SQL database access with Turso integration
- **Vector Storage** (coming soon): Store and query embeddings for AI applications

## Blob Storage Example

```tsx
import { Component } from "@gensx/core";
import { BlobProvider, useBlob } from "@gensx/storage";

// Component that uses blob storage
const SaveData = Component<{ data: unknown }, string>(
  "SaveData",
  async ({ data }) => {
    // Get a blob object for a specific key
    const blob = useBlob("my-data");

    // Save data to the blob
    await blob.put(data);

    // Read the data back
    const result = await blob.get();

    return `Data saved and retrieved: ${JSON.stringify(result?.data)}`;
  },
);

// Main workflow component
export const MyWorkflow = Component<{ input: unknown }, string>(
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

## Blob Storage API

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
