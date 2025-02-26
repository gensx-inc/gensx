import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import {
  CallToolResult,
  GetPromptRequestSchema,
  GetPromptResult,
  Prompt,
  PromptSchema,
  ReadResourceResult,
  Resource,
  ResourceTemplate,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { gsx, GsxComponent } from "gensx";
import { z } from "zod";

export interface MCPServerDefinition {
  clientName: string;
  clientVersion: string;
  serverCommand: string;
  serverArgs: string[];
}

interface MCPServerContext {
  client: Client;
  tools: MCPTool[];
  resources: MCPResource[];
  resourceTemplates: MCPResourceTemplate[];
  prompts: MCPPrompt[];
}

// Define the return type explicitly to avoid exposing internal types
interface MCPServerContextResult {
  useContext: () => MCPServerContext;
  Provider: GsxComponent<{}, never>;
}

export const createMCPServerContext = (
  serverDefinition: MCPServerDefinition,
): MCPServerContextResult => {
  const context = gsx.createContext<MCPServerContext | null>(null);

  const Provider = gsx.Component<{}, never>("MCPServerProvider", async () => {
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
        },
      },
    );

    // Connect to the server
    await client.connect(transport);

    // List available tools
    const availableTools = (await client.listTools()).tools;
    const availableResources = (await client.listResources()).resources;
    const availableResourceTemplates = (await client.listResourceTemplates())
      .resourceTemplates;
    const availablePrompts = (await client.listPrompts()).prompts;

    const tools = availableTools.map(
      (tool) =>
        new MCPTool(client, tool.name, tool.description, tool.inputSchema),
    );
    const resources = availableResources.map(
      (resource) =>
        new MCPResource(
          client,
          resource.name,
          resource.uri,
          resource.description,
          resource.mimeType,
        ),
    );

    const resourceTemplates = availableResourceTemplates.map(
      (template) =>
        new MCPResourceTemplate(
          client,
          template.name,
          template.uriTemplate,
          template.description,
          template.mimeType,
        ),
    );
    const prompts = availablePrompts.map(
      (prompt) =>
        new MCPPrompt(
          client,
          prompt.name,
          prompt.description,
          prompt.arguments,
        ),
    );

    return (
      <context.Provider
        value={{ client, tools, resources, resourceTemplates, prompts }}
        onComplete={async () => {
          await client.close();
        }}
      />
    );
  });

  const useContext = () => {
    const loadedContext = gsx.useContext(context);
    if (!loadedContext) {
      throw new Error("MCPServerContext not found");
    }
    return loadedContext;
  };

  return {
    Provider,
    useContext,
  };
};

export class MCPResource {
  constructor(
    private client: Client,
    public name: string,
    public uri: string,
    public description?: string,
    public mimeType?: string,
  ) {}

  async read(): Promise<ReadResourceResult> {
    const result = await this.client.readResource({
      uri: this.uri,
    });
    return result;
  }

  asResource(): Resource {
    return {
      name: this.name,
      uri: this.uri,
      description: this.description,
      mimeType: this.mimeType,
    };
  }

  toString(): string {
    return `Resource: ${this.name}\nDescription: ${this.description}\nURI: ${this.uri}\nMIME Type: ${this.mimeType}`;
  }
}

export class MCPResourceTemplate {
  constructor(
    private client: Client,
    public name: string,
    public uriTemplate: string,
    public description?: string,
    public mimeType?: string,
  ) {}

  async read(
    substitutions: Record<string, string>,
  ): Promise<ReadResourceResult> {
    const result = await this.client.readResource({
      uri: this.uriTemplate.replace(
        /\{([^{}]+)\}/g,
        (match, p1) => substitutions[p1 as keyof typeof substitutions] ?? match,
      ),
    });
    return result;
  }

  asResourceTemplate(): ResourceTemplate {
    return {
      name: this.name,
      uriTemplate: this.uriTemplate,
      description: this.description,
      mimeType: this.mimeType,
    };
  }

  toString(): string {
    return `Resource Template: ${this.name}\nDescription: ${this.description}\nURI Template: ${this.uriTemplate}\nMIME Type: ${this.mimeType}`;
  }
}

export class MCPPrompt {
  constructor(
    private client: Client,
    public name: string,
    public description?: string,
    public argumentsSchema?: z.infer<typeof PromptSchema>["arguments"],
  ) {}

  async get(
    promptArguments: z.infer<
      typeof GetPromptRequestSchema
    >["params"]["arguments"],
  ): Promise<GetPromptResult> {
    const result = await this.client.getPrompt({
      name: this.name,
      arguments: promptArguments,
    });
    return result;
  }

  asPrompt(): Prompt {
    return {
      name: this.name,
      description: this.description,
      arguments: this.argumentsSchema,
    };
  }

  toString(): string {
    return `Prompt: ${this.name}\nDescription: ${this.description}\nArguments: ${JSON.stringify(
      this.argumentsSchema ?? { type: "object", properties: {} },
    )}`;
  }
}

export class MCPTool {
  public readonly schema: z.ZodObject<z.ZodRawShape>;

  constructor(
    private client: Client,
    public name: string,
    public description?: string,
    public inputSchema?: Tool["inputSchema"],
  ) {
    // Translate JSON schema to zod schema
    this.schema = this.inputSchema
      ? (translateJsonSchemaToZodSchema(
          this.inputSchema,
        ) as z.ZodObject<z.ZodRawShape>)
      : z.object({});
  }

  async run(params: Record<string, unknown>): Promise<CallToolResult> {
    const result = await this.client.callTool({
      name: this.name,
      arguments: params,
    });
    return result as CallToolResult;
  }

  asTool(): Tool {
    return {
      name: this.name,
      description: this.description,
      inputSchema: this.inputSchema ?? { type: "object", properties: {} },
    };
  }

  toString(): string {
    return `Tool: ${this.name}\nDescription: ${this.description}\nInput Schema: ${JSON.stringify(
      this.inputSchema ?? { type: "object", properties: {} },
    )}`;
  }
}

// Define a type for the JSON Schema property
interface JSONSchemaProperty {
  type?: string;
  description?: string;
  [key: string]: unknown;
}

// This is a pretty naive implementation, but it works for a simple case.
function translateJsonSchemaToZodSchema(schema: JSONSchemaProperty): z.ZodType {
  if (schema.type === "object") {
    return z.object(
      Object.entries(schema.properties ?? {}).reduce<Record<string, z.ZodType>>(
        (props, [key, prop]) => {
          props[key] = translateJsonSchemaToZodSchema(
            prop as JSONSchemaProperty,
          );
          return props;
        },
        {},
      ),
    );
  }

  if (schema.type === "string") {
    return z.string();
  }

  if (schema.type === "number") {
    return z.number();
  }

  if (schema.type === "boolean") {
    return z.boolean();
  }

  return z.any();
}
