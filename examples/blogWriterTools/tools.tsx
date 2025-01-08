import { ChatCompletion } from "@gensx/openai";
import { ExecutableValue, gsx } from "gensx";

export interface AgentProps {
  input: string;
  tools: Tool[];
  maxIterations?: number;
}

export interface Tool {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  call: (input: any) => ExecutableValue;
  schema: string;
}

interface ToolCall {
  toolName: string;
  input: unknown;
}

// implement a tool calling agent. This does not use the OpenAI tool API, and just uses a simple JSON format to call tools, as a demonstration of sub-workflow execution.
export const ToolAgent = gsx.Component<AgentProps, string>(
  async ({ input, tools, maxIterations = 10 }) => {
    const SYSTEM_PROMPT = `
You are a helpful AI assistant that can use tools to accomplish tasks.
You have access to the following tools:

${tools
  .map(
    (tool) => `${tool.name}: ${tool.description}
Schema: ${tool.schema}`,
  )
  .join("\n\n")}

To use one or more tools, respond in this exact format:
{"tools": [{"toolName": "tool_name", "input": {...tool input...}}, ...]}

You should call the tools as many times as you need to, and then respond with the final result.

If you have a final response and don't need to use any more tools, respond with just the text of your response.
`.trim();

    const messages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: input },
    ];

    while (maxIterations > 0) {
      const response = await gsx.execute<string>(
        <ChatCompletion messages={messages} model="gpt-4" temperature={0.7} />,
      );

      try {
        // Try to parse as JSON to see if it's a tool call
        const toolCall = JSON.parse(response);
        if (toolCall.tools && toolCall.tools.length > 0) {
          console.info("🔨 Performing tool call:", toolCall);
          const toolCalls = toolCall.tools.map(async (toolCall: ToolCall) => {
            const tool = tools.find((t) => t.name === toolCall.toolName);
            if (!tool) {
              throw new Error(`Tool ${toolCall.toolName} not found`);
            }
            const result = await gsx.execute(tool.call(toolCall.input));
            return { toolName: toolCall.toolName, result };
          });
          const results = await Promise.all(toolCalls);
          console.info("🔨 Tool results:", results);
          messages.push({
            role: "user" as const,
            content: `Tool results: ${JSON.stringify(results)}`,
          });
          if (maxIterations === 1) {
            messages.push({
              role: "user" as const,
              content:
                "Please do not use any more tools, just respond with your final answer.",
            });
          }
        } else {
          console.error("Invalid tool call format:", response);
          // Not a valid tool call format, treat as final response
          return response;
        }
      } catch (e) {
        console.error("Error parsing tool call:", e);
        // If it's not valid JSON, treat it as the final response
        return response;
      }

      maxIterations--;
    }

    throw new Error("Max iterations reached without final response");
  },
);
