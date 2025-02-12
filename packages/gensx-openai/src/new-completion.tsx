import { gsx } from "gensx";
import { zodResponseFormat } from "openai/helpers/zod";
import { ChatCompletionTool } from "openai/resources/index.mjs";
import { z } from "zod";

// Wrapper for structured output schemas
export class GSXStructuredOutput<T> {
  constructor(
    public readonly schema: z.ZodSchema<T>,
    public readonly options: {
      description?: string;
      examples?: T[];
    } = {},
  ) {}

  static create<T>(
    schema: z.ZodSchema<T>,
    options: {
      description?: string;
      examples?: T[];
    } = {},
  ): GSXStructuredOutput<T> {
    return new GSXStructuredOutput(schema, options);
  }

  toResponseFormat() {
    return zodResponseFormat(this.schema, "object", {
      description: this.options.description,
    });
  }

  parse(data: unknown): T {
    return this.schema.parse(data);
  }

  safeParse(data: unknown): z.SafeParseReturnType<unknown, T> {
    return this.schema.safeParse(data);
  }
}

// Wrapper for tool parameter schemas
export class GSXTool<TSchema extends z.ZodObject<z.ZodRawShape>> {
  public readonly type = "function" as const;
  public readonly function: ChatCompletionTool["function"];
  private readonly executionComponent: ReturnType<typeof gsx.Component>;

  constructor(
    public readonly name: string,
    public readonly description: string,
    public readonly parameters: TSchema,
    private readonly executeImpl: (args: z.infer<TSchema>) => Promise<unknown>,
    public readonly options: {
      examples?: z.infer<TSchema>[];
    } = {},
  ) {
    this.function = {
      name: this.name,
      description: this.description,
      parameters: {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(this.parameters.shape).map(([key, value]) => [
            key,
            (value as z.ZodString).description
              ? {
                  type: "string",
                  description: (value as z.ZodString).description,
                }
              : { type: "string" },
          ]),
        ),
        required: Object.keys(this.parameters.shape),
      },
    };

    // Create a component that wraps the execute function
    this.executionComponent = gsx.Component<z.infer<TSchema>, unknown>(
      `Tool[${this.name}]`,
      async (props) => {
        return this.executeImpl(props);
      },
    );
  }

  async execute(args: z.infer<TSchema>): Promise<unknown> {
    // Execute the component through gsx.execute to get checkpointing
    return gsx.execute(<this.executionComponent {...args} />);
  }

  static create<TSchema extends z.ZodObject<z.ZodRawShape>>(
    name: string,
    description: string,
    parameters: TSchema,
    execute: (args: z.infer<TSchema>) => Promise<unknown>,
    options: {
      examples?: z.infer<TSchema>[];
    } = {},
  ): GSXTool<TSchema> {
    return new GSXTool(name, description, parameters, execute, options);
  }
}
