/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { gsx } from "gensx";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";
import { z } from "zod";

import { OpenAIContext } from "./openai.js";
import { OpenAIChatCompletion, OpenAIChatCompletionOutput } from "./openai.js";

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
    public readonly options: {} = {},
  ) {
    // TODO @dereklegenzoff: update to work with things other than strings
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
    options: {} = {},
  ): GSXTool<TSchema> {
    return new GSXTool(name, description, parameters, execute, options);
  }
}

interface ToolExecutorProps {
  tools: GSXTool<any>[];
  toolCalls: NonNullable<
    ChatCompletionOutput["choices"][0]["message"]["tool_calls"]
  >;
  messages: ChatCompletionMessageParam[];
  model: string;
}

type ToolExecutorOutput = ChatCompletionMessageParam[];

// Tools completion component
type ToolsCompletionProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  tools: GSXTool<any>[];
};

type ToolsCompletionOutput = OpenAIChatCompletionOutput;

export const ToolExecutor = gsx.Component<
  ToolExecutorProps,
  ToolExecutorOutput
>("ToolExecutor", async (props) => {
  const { tools, toolCalls } = props;
  const context = gsx.useContext(OpenAIContext);
  if (!context.client) {
    throw new Error(
      "OpenAI client not found in context. Please wrap your component with OpenAIProvider.",
    );
  }

  // Execute each tool call
  return await Promise.all(
    toolCalls.map(async (toolCall) => {
      const tool = tools.find((t) => t.name === toolCall.function.name);
      if (!tool) {
        throw new Error(`Tool ${toolCall.function.name} not found`);
      }

      try {
        const args = JSON.parse(toolCall.function.arguments) as Record<
          string,
          unknown
        >;
        const validated = tool.parameters.safeParse(args);
        if (!validated.success) {
          throw new Error(`Invalid tool arguments: ${validated.error.message}`);
        }
        const result = await tool.execute(validated.data);
        return {
          tool_call_id: toolCall.id,
          role: "tool" as const,
          content: typeof result === "string" ? result : JSON.stringify(result),
        };
      } catch (e) {
        throw new Error(
          `Failed to execute tool ${toolCall.function.name}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }),
  );
});

// Tools completion component
export const ToolsCompletion = gsx.Component<
  ToolsCompletionProps,
  ToolsCompletionOutput
>("ToolsCompletion", async (props) => {
  const { tools, ...rest } = props;
  const currentMessages = [...rest.messages];

  // Make initial completion
  let completion = await gsx.execute<ChatCompletionOutput>(
    <OpenAIChatCompletion {...rest} messages={currentMessages} tools={tools} />,
  );

  // Keep processing tool calls until none are left
  while (completion.choices[0].message.tool_calls?.length) {
    // Add assistant's message to the conversation
    currentMessages.push(completion.choices[0].message);

    // Execute tools
    const toolResponses = await gsx.execute<ChatCompletionMessageParam[]>(
      <ToolExecutor
        tools={tools}
        toolCalls={completion.choices[0].message.tool_calls}
        messages={currentMessages}
        model={rest.model}
      />,
    );

    // Add tool responses to the conversation
    currentMessages.push(...toolResponses);

    // Make next completion
    completion = await gsx.execute<ChatCompletionOutput>(
      <OpenAIChatCompletion
        {...rest}
        messages={currentMessages}
        tools={tools}
      />,
    );
  }

  return completion;
});
