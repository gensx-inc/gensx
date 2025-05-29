import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { useSearch } from "@gensx/storage";
import { embedMany } from "@gensx/vercel-ai";

const embeddingModel = openai.embedding("text-embedding-3-small");

export const InitializeSearch = gensx.Workflow("InitializeSearch", async () => {
  // UseSearch will create the namespace automatically if it doesn't exist.
  const namespace = await useSearch("baseball");

  const documents = [
    {
      id: "1",
      text: "Marcus Bennett is a 1B for the Portland Pioneers",
    },
    {
      id: "2",
      text: "Ethan Carter is a SS for the San Antonio Stallions",
    },
    {
      id: "3",
      text: "Lucas Rivera is a OF for the Charlotte Cougars",
    },
  ];

  const embeddings = await embedMany({
    model: embeddingModel,
    values: documents.map((doc) => doc.text),
  });

  await namespace.write({
    upsertRows: documents.map((doc, index) => ({
      id: doc.id,
      vector: embeddings.embeddings[index],
      text: doc.text,
    })),
    distanceMetric: "cosine_distance",
  });

  return "Search namespace initialized";
});
