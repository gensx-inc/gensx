import { gsx } from "gensx";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { GenerateText } from "@gensx/vercel-ai-sdk";
import { openai } from "@ai-sdk/openai";
import { tool, ToolSet } from "ai";
import { z } from "zod";


interface MCPServerResult {
  client: Client;
  availableTools: any;
}
interface MCPServerProps {
  clientName: string;
  clientVersion: string;
  serverCommand: string;
  serverArgs: string[];
}

const MCPServer = gsx.Component<MCPServerProps, MCPServerResult>(
  "MCPServer",
  async (props: MCPServerProps): Promise<MCPServerResult> => {
    // Create a transport for the MCP server
    const { clientName, clientVersion, serverCommand, serverArgs } = props;
    const transport = new StdioClientTransport({
      command: serverCommand,
      args: serverArgs
    });

    // Create the client with appropriate capabilities
    const client = new Client(
      {
        name: clientName,
        version: clientVersion
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          prompts: {}
        }
      }
    );

    // Connect to the server
    await client.connect(transport);

    // Get server info to confirm connection
    const serverInfo = await client.getServerCapabilities();

    // List available tools
    const availableTools = (await client.listTools()).tools

    return {
      client,
      availableTools,
    };
  }
);

interface MCPToolsConverterProps {
  client: Client;
  availableTools: any[];
}

const MCPToolsConverter = gsx.Component<MCPToolsConverterProps, { aiSdkTools: ToolSet }>(
  "MCPToolsConverter",
  ({ client, availableTools }) => {
    // Create a tools object (not an array)
    const aiSdkTools = availableTools.reduce((acc: ToolSet, mcpTool: any) => {
      acc[mcpTool.name] = tool({
        description: mcpTool.description?.substring(0, 1000) || "A tool",
        parameters: z.object({
          input: z.string().describe("Input for the tool")
        }),
        execute: async (params) => {
          return await client.callTool(mcpTool.name, params);
        }
      });
      return acc;
    }, {});

    return { aiSdkTools };
  }
);

// Example workflow that uses the MCPToolsProvider
const MCPToolsWorkflow = gsx.Workflow("MCPToolsWorkflow", gsx.Component<{ userInput: string }, string>(
  "MCPToolsExample",
  async ({ userInput }) => {
    return (
      <MCPServer
        clientName="GSX-MCP-Tools-Client"
        clientVersion="1.0.0"
        serverCommand="npx"
        serverArgs={["-y", "@modelcontextprotocol/server-sequential-thinking"]}
      >
        {async ({ client, availableTools }) => {
          return (
            <MCPToolsConverter client={client} availableTools={availableTools}>
              {({ aiSdkTools }) => (
                <GenerateText
                  model={openai("gpt-4o-mini")}
                  prompt={userInput}
                  tools={aiSdkTools as ToolSet}
                />
              )}
            </MCPToolsConverter>
          );
        }}
      </MCPServer>
    );
  }
));

// Run the MCP tools workflow with a user input
const mcpToolsResult = await MCPToolsWorkflow.run({
  userInput: "Can you think through how much flooring I would need if I have a 25x25 room but there is a 3.5 x3 ft area in one of the corners. The flooring is 5 in x 4 ft."
}, { printUrl: true });
