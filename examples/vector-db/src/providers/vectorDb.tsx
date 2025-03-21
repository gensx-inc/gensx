import path from "path";
import { fileURLToPath } from "url";

import * as gensx from "@gensx/core";
import { LocalIndex, MetadataFilter, MetadataTypes, QueryResult } from "vectra";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
console.log(__dirname);

interface VectorDBContext {
  addVectors: (
    vectors: {
      id: string;
      vector: number[];
      metadata: Record<string, MetadataTypes>;
    }[],
  ) => Promise<void>;
  search: (
    queryVector: number[],
    options?: {
      topK?: number;
      filter?: MetadataFilter;
    },
  ) => Promise<QueryResult[]>;
}

const loadIndex = async (indexName: string) => {
  const index = new LocalIndex(path.join(__dirname, ".vectors", indexName));
  if (!(await index.isIndexCreated())) {
    await index.createIndex();
  }
  return index;
};

const addVectors = async (
  indexName: string,
  vectors: {
    id: string;
    vector: number[];
    metadata: Record<string, MetadataTypes>;
  }[],
) => {
  const index = await loadIndex(indexName);
  for (const vector of vectors) {
    await index.upsertItem({
      id: vector.id,
      vector: vector.vector,
      metadata: vector.metadata,
    });
  }
};

const search = async (
  indexName: string,
  queryVector: number[],
  options?: {
    topK?: number;
    filter?: MetadataFilter;
  },
) => {
  const index = await loadIndex(indexName);
  return index.queryItems(queryVector, options?.topK ?? 10, options?.filter);
};

const vectorDBContext = gensx.createContext<VectorDBContext>({
  addVectors: () => Promise.reject(new Error("Not implemented")),
  search: () => Promise.reject(new Error("Not implemented")),
});

export const VectorDBProvider = gensx.Component<{ indexName: string }, never>(
  "VectorDBProvider",
  ({ indexName }) => (
    <vectorDBContext.Provider
      value={{
        addVectors: (vectors: Parameters<typeof addVectors>[1]) =>
          addVectors(indexName, vectors),
        search: (queryVector: Parameters<typeof search>[1]) =>
          search(indexName, queryVector),
      }}
    />
  ),
);

export const useVectorDB = () => gensx.useContext(vectorDBContext);
