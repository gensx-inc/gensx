/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import { gsx } from "gensx";
import OpenAI from "openai";
import {
  ChatCompletion as ChatCompletionOutput,
  ChatCompletionCreateParamsNonStreaming,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import { OpenAIContext } from "./openai.js";
import { OpenAIChatCompletion, OpenAIChatCompletionOutput } from "./openai.js";

interface GSXToolParams<TSchema extends z.ZodObject<z.ZodRawShape>> {
  name: string;
  description: string;
  schema: TSchema;
  execute: (args: z.infer<TSchema>) => Promise<unknown>;
  options?: {};
}

// Wrapper for tool parameter schemas
export class GSXTool<TSchema extends z.ZodObject<z.ZodRawShape>> {
  public readonly type = "function" as const;
  public readonly definition: ChatCompletionTool;
  private readonly executionComponent: ReturnType<typeof gsx.Component>;

  constructor(params: GSXToolParams<TSchema>) {
    this.name = params.name;
    this.description = params.description;
    this.schema = params.schema;
    this.options = params.options ?? {};

    this.definition = {
      type: this.type,
      function: {
        name: this.name,
        description: this.description,
        parameters: zodToJsonSchema(this.schema),
      },
    };

    // Create a component that wraps the execute function
    this.executionComponent = gsx.Component<z.infer<TSchema>, unknown>(
      `Tool[${this.name}]`,
      async (props) => {
        return params.execute(props);
      },
    );
  }

  async execute(args: z.infer<TSchema>): Promise<unknown> {
    // Execute the component through gsx.execute to get checkpointing
    return gsx.execute(<this.executionComponent {...args} />);
  }

  static create<TSchema extends z.ZodObject<z.ZodRawShape>>(
    params: GSXToolParams<TSchema>,
  ): GSXTool<TSchema> {
    return new GSXTool(params);
  }

  public readonly name: string;
  public readonly description: string;
  public readonly schema: TSchema;
  public readonly options: {};
}

interface ToolExecutorProps {
  tools: GSXTool<any>[];
  toolCalls: NonNullable<
    ChatCompletionOutput["choices"][0]["message"]["tool_calls"]
  >;
  messages: ChatCompletionMessageParam[];
  model: string;
}

type ToolExecutorOutput = ChatCompletionToolMessageParam[];

// Tools completion component
type ToolsCompletionProps = Omit<
  ChatCompletionCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  tools: GSXTool<any>[];
};

type ToolsCompletionOutput = OpenAIChatCompletionOutput & {
  messages: ChatCompletionMessageParam[];
};

// Extract implementation into a separate function
export const toolExecutorImpl = async (
  props: ToolExecutorProps,
  context: { client?: OpenAI },
): Promise<ToolExecutorOutput> => {
  const { tools, toolCalls } = props;
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
        const validated = tool.schema.safeParse(args);
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
};

export const ToolExecutor = gsx.Component<
  ToolExecutorProps,
  ToolExecutorOutput
>("ToolExecutor", async (props) => {
  const context = gsx.useContext(OpenAIContext);
  return toolExecutorImpl(props, context);
});

// Extract ToolsCompletion implementation
export const toolsCompletionImpl = async (
  props: ToolsCompletionProps,
): Promise<ToolsCompletionOutput> => {
  const { tools, ...rest } = props;
  const currentMessages = [...rest.messages];
  const context = gsx.useContext(OpenAIContext);

  // Make initial completion
  let completion = await gsx.execute<ChatCompletionOutput>(
    <OpenAIChatCompletion
      {...rest}
      messages={currentMessages}
      tools={tools.map((t) => t.definition)}
    />,
  );

  // Keep processing tool calls until none are left
  while (completion.choices[0].message.tool_calls?.length) {
    // Add assistant's message to the conversation
    currentMessages.push(completion.choices[0].message);

    // Execute tools using toolExecutorImpl directly
    const toolResponses = await toolExecutorImpl(
      {
        tools,
        toolCalls: completion.choices[0].message.tool_calls,
        messages: currentMessages,
        model: rest.model,
      },
      context,
    );

    // Add tool responses to the conversation
    currentMessages.push(...toolResponses);

    // Make next completion
    completion = await gsx.execute<ChatCompletionOutput>(
      <OpenAIChatCompletion
        {...rest}
        messages={currentMessages}
        tools={tools.map((t) => t.definition)}
      />,
    );
  }

  // Add the final assistant message to the conversation
  currentMessages.push(completion.choices[0].message);

  return {
    ...completion,
    messages: currentMessages,
  };
};

// Tools completion component
export const ToolsCompletion = gsx.Component<
  ToolsCompletionProps,
  ToolsCompletionOutput
>("ToolsCompletion", toolsCompletionImpl);
