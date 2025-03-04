# @gensx/mcp

Model Context Protocol Support for [GenSX](https://github.com/gensx-inc/gensx)

## Installation

```bash
npm install @gensx/mcp
```

## Usage

The `@gensx/mcp` package provides integration with the [Model Context Protocol (MCP)](https://github.com/model-context-protocol/model-context-protocol) for GenSX workflows. It allows you to use MCP tools in your GenSX applications.

### Creating an MCP Server Context

```tsx
import { createMCPServerContext } from "@gensx/mcp";
import { gsx } from "@gensx/core";

// Create an MCP server context for Sequential Thinking
const {
  Provider: SequentialThinkingProvider,
  useContext: useSequentialThinkingContext,
} = createMCPServerContext({
  clientName: "GSX-MCP-Tools-Client",
  clientVersion: "1.0.0",
  serverCommand: "npx",
  serverArgs: ["-y", "@modelcontextprotocol/server-sequential-thinking"],
});
```

### Using MCP Tools with LLM Providers

You can use MCP tools with any LLM provider in GenSX. Here's an example with OpenAI:

```tsx
import { createMCPServerContext, MCPTool } from "@gensx/mcp";
import { GSXChatCompletion, OpenAIProvider } from "@gensx/openai";
import { gsx } from "@gensx/core";

// Helper function to map MCP tools to GSX tools
const mapToGsxTools = (tools: MCPTool[]) => {
  return tools.map((tool) =>
    GSXTool.create({
      name: tool.name,
      description: tool.description || "",
      schema: tool.schema,
      run: async (params) => await tool.run(params),
    }),
  );
};

// Create a component that uses MCP tools
const RespondWithTools = gsx.Component(({ userInput }) => {
  const { tools } = useSequentialThinkingContext();
  const gsxTools = mapToGsxTools(tools);

  return (
    <GSXChatCompletion
      model="gpt-4o"
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

// Create a workflow that combines MCP tools with an LLM provider
const MCPToolsWorkflow = gsx.Workflow(
  "MCPToolsWorkflow",
  gsx.Component(({ userInput }) => {
    return (
      <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
        <SequentialThinkingProvider>
          <RespondWithTools userInput={userInput}>
            {(result) => result.choices[0].message.content}
          </RespondWithTools>
        </SequentialThinkingProvider>
      </OpenAIProvider>
    );
  }),
);

// Run the workflow
const result = await MCPToolsWorkflow.run({
  userInput:
    "Can you calculate how much flooring I need for a 25x25 room with a 3.5x3 ft area missing in one corner?",
});
```

## API Reference

### `createMCPServerContext(serverDefinition)`

Creates a context provider and hook for accessing MCP tools.

Parameters:

- `serverDefinition`: An object with the following properties:
  - `clientName`: Name of the MCP client
  - `clientVersion`: Version of the MCP client
  - `serverCommand`: Command to start the MCP server
  - `serverArgs`: Arguments for the server command

Returns:

- `Provider`: A GenSX component that provides the MCP context
- `useContext`: A hook to access the MCP context

### `MCPTool`

A class representing an MCP tool.

Properties:

- `name`: The name of the tool
- `description`: The description of the tool
- `schema`: The Zod schema for the tool's input

Methods:

- `run(params)`: Runs the tool with the given parameters
