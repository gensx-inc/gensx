import * as gensx from "@gensx/core";
import {
  GSXChatCompletion,
  GSXTool,
  OpenAIEmbedding,
  OpenAIProvider,
} from "@gensx/openai";
import { SearchProvider, useSearch } from "@gensx/storage";
import { z } from "zod";

import { DataIngestionWorkflow } from "./data-ingestion.js";

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

// Create the workflow
const RagWorkflow = gensx.Workflow("RagWorkflow", RagWorkflowComponent);

export { RagWorkflow, DataIngestionWorkflow };
