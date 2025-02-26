import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";
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

    const tools = availableTools.map(
      (tool) =>
        new MCPTool(client, tool.name, tool.description, tool.inputSchema),
    );

    return (
      <context.Provider
        value={{ client, tools }}
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

export class MCPTool {
  public readonly schema: z.ZodObject<z.ZodRawShape>;

  constructor(
    private client: Client,
    public name: string,
    public description?: string,
    public inputSchema?: z.infer<typeof ToolSchema>["inputSchema"],
  ) {
    // Translate JSON schema to zod schema
    this.schema = this.inputSchema
      ? (translateJsonSchemaToZodSchema(
          this.inputSchema,
        ) as z.ZodObject<z.ZodRawShape>)
      : z.object({});
  }

  async run(params: Record<string, unknown>): Promise<unknown> {
    const result = await this.client.callTool({
      name: this.name,
      arguments: params,
    });
    return result;
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
