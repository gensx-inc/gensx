import * as gensx from "@gensx/core";
import { GSXChatCompletion, GSXTool, OpenAIProvider } from "@gensx/openai";
import { DatabaseProvider, useDatabase } from "@gensx/storage";
import { z } from "zod";

import { DataIngestionWorkflow } from "./data-ingestion.js";

// Define the query tool schema
const querySchema = z.object({
  query: z.string().describe("The SQL query to execute"),
});

type QueryParams = z.infer<typeof querySchema>;

// Create the query tool
const queryTool = new GSXTool({
  name: "execute_query",
  description: "Execute a SQL query against the baseball database",
  schema: querySchema,
  run: async ({ query }: QueryParams) => {
    const db = await useDatabase("baseball");
    const result = await db.execute(query);
    return JSON.stringify(result, null, 2);
  },
});

// SQL Copilot component that wraps GSXChatCompletion
const SqlCopilot = gensx.Component<{ question: string }, string>(
  "SqlCopilot",
  ({ question }) => (
    <GSXChatCompletion
      messages={[
        {
          role: "system",
          content: `You are a helpful SQL assistant. You have access to a baseball statistics database with the following schema:
          TABLE baseball_stats (
            player TEXT,
            team TEXT,
            position TEXT,
            at_bats INTEGER,
            hits INTEGER,
            runs INTEGER,
            home_runs INTEGER,
            rbi INTEGER,
            batting_avg REAL,
            obp REAL,
            slg REAL,
            ops REAL
          )

          The table contains statistics for various baseball players. You can use the execute_query tool to run SQL queries against this database.
          When asked a question, first think about what SQL query would answer it, then use the tool to execute that query.
          After getting the results, explain them in a clear and concise way.`,
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

interface DatabaseWorkflowProps {
  question: string;
}

// Main workflow component
const DatabaseWorkflowComponent = gensx.Component<
  DatabaseWorkflowProps,
  string
>("DatabaseWorkflowComponent", ({ question }) => (
  <DatabaseProvider kind="cloud">
    <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
      <SqlCopilot question={question} />
    </OpenAIProvider>
  </DatabaseProvider>
));

// Create the workflow
const DatabaseWorkflow = gensx.Workflow(
  "DatabaseWorkflow",
  DatabaseWorkflowComponent,
);

export { DatabaseWorkflow, DataIngestionWorkflow };
