import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  CallToolResult,
  GetPromptRequestSchema,
  GetPromptResult,
  Prompt,
  PromptSchema,
  Resource,
  ResourceTemplate,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { GSXToolAnySchema, GSXToolParams } from "gensx";
import { z } from "zod";

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

  asGSXTool(): GSXToolParams<GSXToolAnySchema> {
    return {
      name: this.name,
      description: this.description ?? "",
      schema: this.schema,
      run: this.run.bind(this),
    };
  }

  asMCPTool(): Tool {
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
