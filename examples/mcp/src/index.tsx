import * as gensx from "@gensx/core";
import { createMCPServerContext } from "@gensx/mcp";
import {
  GSXChatCompletion,
  GSXChatCompletionResult,
  OpenAIProvider,
} from "@gensx/openai";

import packageJson from "../package.json" assert { type: "json" };

// Check for OpenAI API key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY environment variable is required");
  console.error("Please set it before running this example:");
  console.error("  export OPENAI_API_KEY=your_api_key_here");
  process.exit(1);
}

const {
  Provider: SequentialThinkingProvider,
  useContext: useSequentialThinkingContext,
} = createMCPServerContext({
  clientName: "GSX-MCP-Tools-Client",
  clientVersion: packageJson.version,
  serverCommand: "npx",
  serverArgs: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
});

const RespondWithTools = gensx.Component<
  { userInput: string },
  GSXChatCompletionResult
>("RespondWithTools", ({ userInput }) => {
  const { tools } = useSequentialThinkingContext();
  const gsxTools = tools.map((tool) => tool.asGSXTool());

  return (
    <GSXChatCompletion
      model={"gpt-4o"}
      messages={[
        {
          role: "system",
          content:
            "You are a helpful assistant that can use tools to answer questions.",
        },
        {
          role: "user",
          content: userInput,
        },
      ]}
      tools={gsxTools}
    />
  );
});

// Example workflow that uses the MCPToolsProvider
const MCPToolsWorkflow = gensx.Workflow(
  "MCPToolsWorkflow",
  gensx.Component<{ userInput: string }, string>(
    "MCPToolsExample",
    ({ userInput }) => {
      return (
        <OpenAIProvider apiKey={OPENAI_API_KEY}>
          <SequentialThinkingProvider>
            <RespondWithTools userInput={userInput}>
              {(result) => {
                return result.choices[0].message.content;
              }}
            </RespondWithTools>
          </SequentialThinkingProvider>
        </OpenAIProvider>
      );
    },
  ),
);

// Run the MCP tools workflow with a user input
const mcpToolsResult = await MCPToolsWorkflow.run(
  {
    userInput:
      "Can you think through how much flooring I would need if I have a 25x25 room but there is a 3.5 x3 ft area in one of the corners. The flooring is 5 in x 4 ft.",
  },
  { printUrl: true },
);

console.info(mcpToolsResult);
