/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */

import {
  Message,
  MessageCreateParamsNonStreaming,
  MessageParam,
  Tool,
  ToolUseBlock,
} from "@anthropic-ai/sdk/resources/index.mjs";
import * as gensx from "@gensx/core";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import {
  AnthropicChatCompletion,
  AnthropicChatCompletionOutput,
} from "./anthropic.js";

// Wrapper for tool parameter schemas
export class GSXTool<TSchema extends gensx.GSXToolAnySchema> {
  public readonly type = "function";
  public readonly definition: Tool;
  private readonly executionComponent: ReturnType<typeof gensx.Component>;

  constructor(params: gensx.GSXToolProps<TSchema>) {
    this.name = params.name;
    this.description = params.description;
    this.schema = params.schema;
    this.options = params.options ?? {};

    if (this.description.length > 1024) {
      this.description = this.description.slice(0, 1021) + "...";
    }

    this.definition = {
      name: this.name,
      description: this.description,
      input_schema: zodToJsonSchema(this.schema) as Tool.InputSchema,
    };

    // Create a component that wraps the execute function
    this.executionComponent = gensx.Component<z.infer<TSchema>, unknown>(
      `Tool[${this.name}]`,
      async (props) => {
        return params.run(props);
      },
    );
  }

  async run(args: z.infer<TSchema>): Promise<unknown> {
    // Execute the component through gensx.execute to get checkpointing
    return gensx.execute(<this.executionComponent {...args} />);
  }

  static create<TSchema extends gensx.GSXToolAnySchema>(
    params: gensx.GSXToolProps<TSchema>,
  ): GSXTool<TSchema> {
    return new GSXTool(params);
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      description: this.description,
      schema: this.definition.input_schema,
    };
  }

  public readonly name: string;
  public readonly description: string;
  public readonly schema: TSchema;
  public readonly options: {};
}

interface ToolExecutorProps {
  tools: GSXTool<any>[];
  toolCalls: NonNullable<ToolUseBlock>[];
}

type ToolExecutorOutput = MessageParam;

// Tools completion component
type ToolsCompletionProps = Omit<
  MessageCreateParamsNonStreaming,
  "stream" | "tools"
> & {
  tools: GSXTool<any>[];
};

type ToolsCompletionOutput = AnthropicChatCompletionOutput & {
  messages: MessageParam[];
};

// Extract implementation into a separate function
export const toolExecutorImpl = async (
  props: ToolExecutorProps,
): Promise<ToolExecutorOutput> => {
  const { tools, toolCalls } = props;

  // Execute each tool call
  const toolContents = await Promise.all(
    toolCalls.map(async (toolCall) => {
      const tool = tools.find((t) => t.name === toolCall.name);
      if (!tool) {
        throw new Error(`Tool ${toolCall.name} not found`);
      }

      try {
        const args = toolCall.input as Record<string, unknown>;
        const validated = tool.schema.safeParse(args);
        if (!validated.success) {
          throw new Error(`Invalid tool arguments: ${validated.error.message}`);
        }
        const result = await tool.run(validated.data);
        return {
          type: "tool_result" as const,
          tool_use_id: toolCall.id,
          content: typeof result === "string" ? result : JSON.stringify(result),
        };
      } catch (e) {
        throw new Error(
          `Failed to execute tool ${toolCall.name}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }),
  );

  return { role: "user", content: toolContents };
};

export const ToolExecutor = gensx.Component<
  ToolExecutorProps,
  ToolExecutorOutput
>("ToolExecutor", async (props) => {
  return toolExecutorImpl(props);
});

// Extract ToolsCompletion implementation
export const toolsCompletionImpl = async (
  props: ToolsCompletionProps,
): Promise<ToolsCompletionOutput> => {
  const { tools, ...rest } = props;
  const currentMessages = [...rest.messages];

  // Make initial completion
  let completion = await gensx.execute<Message>(
    <AnthropicChatCompletion
      {...rest}
      messages={currentMessages}
      tools={tools.map((t) => t.definition)}
    />,
  );

  // Keep processing tool calls until none are left
  while (completion.stop_reason === "tool_use") {
    // Add assistant's message to the conversation
    currentMessages.push({
      role: "assistant",
      content: completion.content,
    });

    // Execute tools using toolExecutorImpl directly
    const toolResponses = await toolExecutorImpl({
      tools,
      toolCalls: completion.content.filter<ToolUseBlock>(
        (content) => content.type === "tool_use",
      ),
    });

    // Add tool responses to the conversation
    currentMessages.push(toolResponses);

    // Make next completion
    completion = await gensx.execute<Message>(
      <AnthropicChatCompletion
        {...rest}
        messages={currentMessages}
        tools={tools.map((t) => t.definition)}
      />,
    );
  }

  // Add the final assistant message to the conversation
  currentMessages.push({
    role: "assistant",
    content: completion.content,
  });

  return {
    ...completion,
    messages: currentMessages,
  };
};

// Tools completion component
export const ToolsCompletion = gensx.Component<
  ToolsCompletionProps,
  ToolsCompletionOutput
>("ToolsCompletion", toolsCompletionImpl);
