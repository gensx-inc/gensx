#!/usr/bin/env node

import { readConfig } from "@gensx/core";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Command line argument parsing
const args = process.argv.slice(2);
if (args.length < 3) {
  console.error("Usage: gensx-cloud-mcp <org> <projectName> <environmentName>");
  process.exit(1);
}

const [org, projectName, environmentName] = args;
const baseUrl = "https://api.gensx.com";

// Get API key from environment variable or config file
function getApiKey(): string {
  // Environment variable takes precedence
  const envApiKey = process.env.GENSX_API_KEY;
  if (envApiKey) {
    console.error("Using API key from environment variable");
    return envApiKey;
  }

  // Fall back to config file
  const config = readConfig();
  if (config.api?.token) {
    console.error("Using API key from config file");
    return config.api.token;
  }

  console.error(
    "No API key found. Please set GENSX_API_KEY environment variable or configure API key in ~/.gensx/config.json",
  );
  process.exit(1);
}

// Debug logging function
function debugLog(message: string, data?: unknown): void {
  console.error(`[DEBUG] ${message}`);
  if (data !== undefined) {
    console.error(JSON.stringify(data, null, 2));
  }
}

// API response type
interface ApiResponse<T> {
  status: string;
  data: T;
}

// API client for GenSX Cloud
class GenSXClient {
  constructor(
    private readonly org: string,
    private readonly projectName: string,
    private readonly environmentName: string,
    private readonly apiKey: string,
    private readonly baseUrl = "https://api.gensx.com",
  ) {}

  private async request<T>(
    path: string,
    method = "GET",
    body?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const options = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    debugLog(`API Request: ${method} ${url}`);

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GenSX API error (${response.status}): ${errorText}`);
      }

      const apiResponse = (await response.json()) as ApiResponse<T>;
      debugLog(`API Response: ${method} ${url}`, apiResponse);

      if (apiResponse.status !== "ok") {
        throw new Error(`API returned non-ok status: ${apiResponse.status}`);
      }

      return apiResponse.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      debugLog(`API Error: ${method} ${url}`, error.message);
      throw error;
    }
  }

  async getProject() {
    const path = `/org/${this.org}/projects/${this.projectName}`;
    return this.request<{
      id: string;
      name: string;
      description: string | null;
      orgId: string;
      defaultEnvironmentName: string;
      defaultEnvironmentId: string;
    }>(path);
  }

  async listWorkflows() {
    const path = `/org/${this.org}/projects/${this.projectName}/environments/${this.environmentName}/workflows`;
    return this.request<{
      workflows: {
        id: string;
        name: string;
        inputSchema: Record<string, unknown> | null;
        outputSchema: Record<string, unknown> | null;
        createdAt: string;
        updatedAt: string;
        url: string;
      }[];
    }>(path);
  }

  async getWorkflow(workflowName: string) {
    const path = `/org/${this.org}/projects/${this.projectName}/environments/${this.environmentName}/workflows/${workflowName}`;
    return this.request<{
      id: string;
      name: string;
      inputSchema: Record<string, unknown> | null;
      outputSchema: Record<string, unknown> | null;
      createdAt: string;
      updatedAt: string;
      url: string;
    }>(path);
  }

  async runWorkflow(workflowName: string, input: Record<string, unknown>) {
    const path = `/org/${this.org}/projects/${this.projectName}/environments/${this.environmentName}/workflows/${workflowName}`;

    // This is a raw response, so we need to handle it differently
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    const options = {
      method: "POST",
      headers,
      body: JSON.stringify({ input }),
    };

    debugLog(`API Request: POST ${url}`, { input });

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GenSX API error (${response.status}): ${errorText}`);
      }

      // Since this is a raw response, we just get the response text directly
      const rawResult = await response.text();
      debugLog(`API Response: POST ${url}`, rawResult);

      return rawResult;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      debugLog(`API Error: POST ${url}`, error.message);
      throw error;
    }
  }
}

// Define the expected structure for workflow tools
interface WorkflowTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  validator: (input: Record<string, unknown>) => boolean;
}

// Server setup
async function setupServer() {
  try {
    // Get API key
    const apiKey = getApiKey();

    const client = new GenSXClient(
      org,
      projectName,
      environmentName,
      apiKey,
      baseUrl,
    );

    // Get project info
    const project = await client.getProject();
    console.error(`Connected to project: ${project.name}`);
    console.error(
      `Project description: ${project.description ?? "No description"}`,
    );
    debugLog("Project details:", project);

    // Get workflows
    const { workflows } = await client.listWorkflows();
    console.error(
      `Found ${workflows.length} workflows in environment ${environmentName}`,
    );

    // Convert workflows to tools
    const workflowTools = await Promise.all(
      workflows.map(async (workflow) => {
        try {
          // For workflows without a schema, fetch detailed information
          if (!workflow.inputSchema) {
            console.error(
              `Workflow ${workflow.name} has no input schema, fetching details...`,
            );
            const detailedWorkflow = await client.getWorkflow(workflow.name);
            workflow.inputSchema = detailedWorkflow.inputSchema;
            workflow.outputSchema = detailedWorkflow.outputSchema;
          }

          // Create a simple validator function based on required fields in the schema
          const validator = (input: Record<string, unknown>): boolean => {
            // If no schema, accept any input
            if (!workflow.inputSchema) return true;

            // Basic validation: check that required fields are present
            const schemaObj = workflow.inputSchema;
            const requiredFields = Array.isArray(schemaObj.required)
              ? (schemaObj.required as string[])
              : [];

            return requiredFields.every(
              (field) =>
                Object.prototype.hasOwnProperty.call(input, field) &&
                input[field] !== undefined,
            );
          };

          // Use the JSON schema directly
          const tool: WorkflowTool = {
            name: workflow.name,
            description: `Run the GenSX Cloud workflow '${workflow.name}' from ${org}/${projectName}/${environmentName}`,
            inputSchema: workflow.inputSchema ?? {
              type: "object",
              properties: {},
            },
            validator,
          };

          console.error(`Registered tool: ${tool.name}`);
          console.error(`  Schema: ${JSON.stringify(tool.inputSchema)}`);

          return tool;
        } catch (error) {
          console.error(`Error processing workflow ${workflow.name}:`, error);
          return null;
        }
      }),
    );

    // Filter out any failed workflow tools
    const validTools = workflowTools.filter(
      (tool): tool is WorkflowTool => tool !== null,
    );
    console.error(`Successfully registered ${validTools.length} tools`);

    // Create server
    const server = new Server(
      {
        name: "gensx-cloud-mcp",
        version: "0.1.0",
        description: `GenSX Cloud MCP Server for ${org}/${projectName}/${environmentName}`,
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    // Set up request handlers
    server.setRequestHandler(ListToolsRequestSchema, () => {
      debugLog("ListTools request received");
      const tools = validTools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
      debugLog("Returning tools:", tools);
      return { tools };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name: workflowName, arguments: toolArgs } = request.params;
        debugLog(`CallTool request for ${workflowName}`, toolArgs);

        // Find the tool/workflow
        const tool = validTools.find((t) => t.name === workflowName);
        if (!tool) {
          throw new Error(`Unknown workflow: ${workflowName}`);
        }

        // Ensure args is not undefined and is an object
        const args = toolArgs ?? {};

        // Validate input using our simple validator
        if (!tool.validator(args)) {
          throw new Error(
            `Invalid arguments for workflow ${workflowName}: missing required fields`,
          );
        }

        // Run the workflow
        debugLog(`Running workflow ${workflowName} with args:`, args);
        const result = await client.runWorkflow(workflowName, args);
        debugLog(`Workflow ${workflowName} execution result:`, result);

        // Return the raw result directly
        return {
          content: [
            {
              type: "text",
              text: result,
            },
          ],
        };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error(`Error executing workflow: ${error.message}`);
        return {
          content: [{ type: "text", text: `Error: ${error.message}` }],
          isError: true,
        };
      }
    });

    return server;
  } catch (error) {
    console.error("Error setting up server:", error);
    process.exit(1);
    throw error; // This will never be reached, but helps TypeScript understand flow control
  }
}

// Start server
async function runServer() {
  try {
    console.error(
      `Starting GenSX Cloud MCP Server for ${org}/${projectName}/${environmentName}`,
    );
    console.error(`Debug mode: enabled`);

    const server = await setupServer();
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error(
      `GenSX Cloud MCP Server running on stdio for ${org}/${projectName}/${environmentName}`,
    );
  } catch (error) {
    console.error("Fatal error running server:", error);
    process.exit(1);
  }
}

runServer().catch((error: unknown) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
