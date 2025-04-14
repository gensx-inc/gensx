import * as gensx from "@gensx/core";
import { OpenAIEmbedding, OpenAIProvider } from "@gensx/openai";
import { SearchProvider, useSearch } from "@gensx/storage";

// Database initialization component
const SearchInitializer = gensx.Component<{}, string>(
  "SearchInitializer",
  async () => {
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

    const embeddings = await OpenAIEmbedding.run({
      model: "text-embedding-3-small",
      input: documents.map((doc) => doc.text),
    });

    await namespace.upsert({
      vectors: documents.map((doc, index) => ({
        id: doc.id,
        vector: embeddings.data[index].embedding,
        attributes: { text: doc.text },
      })),
      distanceMetric: "cosine_distance",
    });

    return "Search namespace initialized";
  },
);

// Main workflow component
const DataIngestionWorkflowComponent = gensx.Component<{}, null>(
  "DataIngestionWorkflowComponent",
  () => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <SearchProvider>
        <SearchInitializer />
      </SearchProvider>
    </OpenAIProvider>
  ),
);

// Create the workflow
const DataIngestionWorkflow = gensx.Workflow(
  "DataIngestionWorkflow",
  DataIngestionWorkflowComponent,
);

export { DataIngestionWorkflow };
