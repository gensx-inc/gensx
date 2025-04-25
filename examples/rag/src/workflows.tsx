import * as gensx from "@gensx/core";
import {
  GSXChatCompletion,
  GSXTool,
  OpenAIEmbedding,
  OpenAIProvider,
} from "@gensx/openai";
import { SearchProvider, useSearch } from "@gensx/storage";
import { z } from "zod";

//import { InitializeSearch } from "./data-ingestion.js";

// Define the query tool schema
const querySchema = z.object({
  query: z.string().describe("The text query to search for"),
});

type QueryParams = z.infer<typeof querySchema>;

// Create the query tool
const queryTool = new GSXTool({
  name: "query",
  description: "Query the search index",
  schema: querySchema,
  run: async ({ query }: QueryParams) => {
    const search = await useSearch("baseball");
    const embedding = await OpenAIEmbedding.run({
      model: "text-embedding-3-small",
      input: query,
    });
    const result = await search.query({
      vector: embedding.data[0].embedding,
      includeAttributes: true,
    });
    return JSON.stringify(result, null, 2);
  },
});

// RAG agent component that wraps GSXChatCompletion
const RagAgent = gensx.Component<{ question: string }, string>(
  "RagAgent",
  ({ question }) => (
    <GSXChatCompletion
      messages={[
        {
          role: "system",
          content: `You are a helpful assistant.`,
        },
        {
          role: "user",
          content: question,
        },
      ]}
      model="gpt-4o-mini"
      temperature={0.7}
      tools={[queryTool]}
    >
      {(result) => result.choices[0].message.content}
    </GSXChatCompletion>
  ),
);

interface RagWorkflowProps {
  question: string;
}

// Main workflow component
const RagWorkflowComponent = gensx.Component<RagWorkflowProps, string>(
  "RagWorkflowComponent",
  ({ question }) => (
    <SearchProvider>
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <RagAgent question={question} />
      </OpenAIProvider>
    </SearchProvider>
  ),
);

// Component for initializing the namespace
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

    await namespace.write({
      upsertRows: documents.map((doc, index) => ({
        id: doc.id,
        vector: embeddings.data[index].embedding,
        text: doc.text,
      })),
      distanceMetric: "cosine_distance",
    });

    return "Search namespace initialized";
  },
);

const InitializeSearchComponent = gensx.Component<{}, string>(
  "InitializeSearchComponent",
  () => (
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <SearchProvider>
        <SearchInitializer />
      </SearchProvider>
    </OpenAIProvider>
  ),
);

// Create the workflows
const InitializeSearch = gensx.Workflow(
  "InitializeSearch",
  InitializeSearchComponent,
);

const RagWorkflow = gensx.Workflow("RagWorkflow", RagWorkflowComponent);

export { RagWorkflow, InitializeSearch };
