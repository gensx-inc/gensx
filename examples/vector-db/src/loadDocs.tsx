import fs from "fs";
import path from "path";

import * as gensx from "@gensx/core";
import { OpenAIEmbedding, OpenAIProvider } from "@gensx/openai";

import { useVectorDB, VectorDBProvider } from "./providers/vectorDb.js";

const ChunkText = gensx.Component<{ text: string }, { textChunks: string[] }>(
  "ChunkText",
  ({ text }) => {
    // This is very naive, just spits by "---", which is a marker in the example docs.
    // There are many libraries to do more sophisticated chunking, for varying types of content.
    const chunks = text
      .split("---")
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.length > 0);
    return { textChunks: chunks };
  },
);

const CreateEmbedding = gensx.Component<
  { textChunks: string[]; docName: string },
  { vectors: { vector: number[]; content: string }[]; docName: string }
>("CreateEmbedding", async ({ textChunks, docName }) => {
  const embeddings = await OpenAIEmbedding.run({
    input: textChunks,
    model: "text-embedding-3-small",
  });

  return {
    vectors: embeddings.data.map((embedding, idx) => ({
      vector: embedding.embedding,
      content: textChunks[idx],
    })),
    docName,
  };
});

const CreateEmbeddings = gensx.Component<
  { docs: { name: string; text: string }[] },
  { vectors: { vector: number[]; content: string }[]; docName: string }[]
>("CreateEmbeddings", ({ docs }) => {
  return gensx
    .array(docs)
    .map((doc) => (
      <ChunkText text={doc.text}>
        {({ textChunks }) => (
          <CreateEmbedding textChunks={textChunks} docName={doc.name} />
        )}
      </ChunkText>
    ));
});

const PersistEmbeddings = gensx.Component<
  {
    embeddings: {
      vectors: { vector: number[]; content: string }[];
      docName: string;
    }[];
  },
  {}
>("PersistEmbeddings", async ({ embeddings }) => {
  const { addVectors } = useVectorDB();

  const vectorsToAdd = embeddings.flatMap((embedding) =>
    embedding.vectors.map((vector, idx) => ({
      id: `${embedding.docName}-${idx}`,
      vector: vector.vector,
      metadata: {
        text: vector.content,
      },
    })),
  );

  await addVectors(vectorsToAdd);

  return {};
});

const EmbedDocs = gensx.Component<
  { docs: { name: string; text: string }[] },
  never
>("LoadDocs", ({ docs }) => (
  <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
    <VectorDBProvider indexName="docs">
      <CreateEmbeddings docs={docs}>
        {(embeddings) => <PersistEmbeddings embeddings={embeddings} />}
      </CreateEmbeddings>
    </VectorDBProvider>
  </OpenAIProvider>
));

const ReadDocs = gensx.Component<
  { dir: string },
  { docs: { name: string; text: string }[] }
>("ReadDocs", ({ dir }) => {
  const docs = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".md"))
    .map((file) => ({
      name: file,
      text: fs.readFileSync(path.join(dir, file), "utf8"),
    }));

  return { docs };
});

const LoadDocs = gensx.Component<{ dir: string }, never>(
  "LoadDocs",
  ({ dir }) => (
    <ReadDocs dir={dir}>{({ docs }) => <EmbedDocs docs={docs} />}</ReadDocs>
  ),
);

export const LoadDocsWorkflow = gensx.Workflow("LoadDocsWorkflow", LoadDocs);
