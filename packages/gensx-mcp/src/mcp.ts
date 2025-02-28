import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { McpError } from "@modelcontextprotocol/sdk/types.js";

import {
  MCPPrompt,
  MCPResource,
  MCPResourceTemplate,
  MCPTool,
} from "./wrappers.js";

export type MCPServerDefinition =
  | {
      clientName: string;
      clientVersion: string;
      serverCommand: string;
      serverArgs: string[];
      roots?: Record<string, string>;
    }
  | { client: Client };

export async function instantiateMcpClient(
  serverDefinition: MCPServerDefinition,
) {
  if ("client" in serverDefinition) {
    return { client: serverDefinition.client, closeOnComplete: false };
  }

  const { clientName, clientVersion, serverCommand, serverArgs } =
    serverDefinition;

  // Create a transport for the MCP server
  const transport = new StdioClientTransport({
    command: serverCommand,
    args: serverArgs,
  });

  // Create the client with appropriate capabilities
  const client = new Client(
    {
      name: clientName,
      version: clientVersion,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
        prompts: {},
        resourceTemplates: {},
        roots: serverDefinition.roots,
      },
    },
  );

  // Connect to the server
  await client.connect(transport);

  return { client, closeOnComplete: true };
}

export async function fetchMcpContext(serverDefinition: MCPServerDefinition) {
  const { client, closeOnComplete } =
    await instantiateMcpClient(serverDefinition);
  const tools = await getTools(client);
  const resources = await getResources(client);
  const resourceTemplates = await getResourceTemplates(client);
  const prompts = await getPrompts(client);

  return {
    client,
    closeOnComplete,
    tools,
    prompts,
    resourceTemplates,
    resources,
  };
}

async function getTools(client: Client): Promise<MCPTool[]> {
  try {
    const availableTools = (await client.listTools()).tools;
    return availableTools.map(
      (tool) =>
        new MCPTool(client, tool.name, tool.description, tool.inputSchema),
    );
  } catch (error) {
    if (
      error instanceof McpError &&
      error.message.includes("Method not found")
    ) {
      return [];
    }
    throw error;
  }
}

async function getResources(client: Client): Promise<MCPResource[]> {
  try {
    const availableResources = (await client.listResources()).resources;
    return availableResources.map(
      (resource) =>
        new MCPResource(
          client,
          resource.name,
          resource.uri,
          resource.description,
          resource.mimeType,
        ),
    );
  } catch (error) {
    if (
      error instanceof McpError &&
      error.message.includes("Method not found")
    ) {
      return [];
    }
    throw error;
  }
}

async function getResourceTemplates(
  client: Client,
): Promise<MCPResourceTemplate[]> {
  try {
    const availableResourceTemplates = (await client.listResourceTemplates())
      .resourceTemplates;
    return availableResourceTemplates.map(
      (template) =>
        new MCPResourceTemplate(
          client,
          template.name,
          template.uriTemplate,
          template.description,
          template.mimeType,
        ),
    );
  } catch (error) {
    if (
      error instanceof McpError &&
      error.message.includes("Method not found")
    ) {
      return [];
    }
    throw error;
  }
}

async function getPrompts(client: Client): Promise<MCPPrompt[]> {
  try {
    const availablePrompts = (await client.listPrompts()).prompts;
    return availablePrompts.map(
      (prompt) =>
        new MCPPrompt(
          client,
          prompt.name,
          prompt.description,
          prompt.arguments,
        ),
    );
  } catch (error) {
    if (
      error instanceof McpError &&
      error.message.includes("Method not found")
    ) {
      return [];
    }
    throw error;
  }
}
