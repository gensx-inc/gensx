import * as gensx from "@gensx/core";
import { OpenAI } from "@gensx/openai";
import FirecrawlApp from "@mendable/firecrawl-js";
import {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from "openai/resources/chat/completions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Initialize the Firecrawl client with your API key
const app = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! });

// Define our own chat message type structure that is compatible with OpenAI's API
// interface ChatMessage {
//   role: "system" | "user" | "assistant" | "tool";
//   content: string | null;
//   tool_calls?: ToolCall[];
//   tool_call_id?: string;
// }

interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for current information on any topic.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search query to find information about",
          },
          limit: {
            type: "number",
            description: "Number of search results to return (default: 5)",
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Get current temperature for a given location.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "City and country e.g. Bogotá, Colombia",
          },
        },
        required: ["location"],
        additionalProperties: false,
      },
      strict: true,
    },
  },
];

// Define proper types for search results
interface SearchResult {
  title: string;
  url: string;
  description: string;
}

// Web search function using Firecrawl
export const web_search = gensx.Component(
  "web_search",
  async ({
    query,
    limit = 5,
  }: {
    query: string;
    limit?: number;
  }): Promise<string> => {
    try {
      // Perform a basic search
      const searchResult = await app.search(query, { limit });

      if (!searchResult.success) {
        return `Search failed: ${searchResult.error ?? "Unknown error"}`;
      }

      // Format the search results with proper typing
      const results: SearchResult[] = searchResult.data.map((result) => ({
        title: result.title ?? "No title",
        url: result.url ?? "",
        description: result.description ?? "No description",
      }));

      return `Found ${results.length} results for "${query}":\n\n${results
        .map(
          (result: SearchResult, index: number) =>
            `${index + 1}. **${result.title}**\n   ${result.description}\n   ${result.url}`,
        )
        .join("\n\n")}`;
    } catch (error) {
      return `Error searching: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
);

// Mock weather function as a gensx component
export const get_weather = gensx.Component(
  "get_weather",
  ({ location }: { location: string }) => {
    // In a real implementation, you'd call a weather API
    // Generate random weather conditions and temperature for more variety
    const conditions = [
      "sunny",
      "cloudy",
      "rainy",
      "stormy",
      "foggy",
      "windy",
      "snowy",
    ];
    const condition = conditions[Math.floor(Math.random() * conditions.length)];
    const temperature = Math.floor(Math.random() * 21) + 10; // Random temp between 10°C and 30°C
    return `The weather in ${location} is ${condition} with a temperature of ${temperature}°C.`;
  },
);

const toolFunctions = {
  web_search,
  get_weather,
};

export const OpenAIAgent = gensx.Component(
  "OpenAIAgent",
  async ({ userInput }: { userInput: string }) => {
    const messages: ChatCompletionMessageParam[] = [
      { role: "user", content: userInput },
    ];

    return await processMessagesWithTools(messages);
  },
);

async function processMessagesWithTools(
  messages: ChatCompletionMessageParam[],
): Promise<string> {
  const result = await openai.chat.completions.create({
    messages,
    model: "gpt-4.1-mini",
    stream: true,
    tools,
  });

  let text = "";
  const toolCalls: ToolCall[] = [];
  const messageId = Date.now().toString();

  for await (const chunk of result) {
    const delta = chunk.choices[0].delta;

    // Handle content streaming
    if (delta.content) {
      text += delta.content as string;
      gensx.publishData({
        id: messageId,
        role: "assistant",
        delta: delta.content,
      });
    }

    // Handle tool call streaming
    if (delta.tool_calls) {
      for (const toolCallDelta of delta.tool_calls) {
        const index = toolCallDelta.index!;

        // Initialize tool call if it doesn't exist
        if (!toolCalls[index]) {
          toolCalls[index] = {
            id: toolCallDelta.id ?? "",
            type: toolCallDelta.type ?? "function",
            function: {
              name: toolCallDelta.function?.name ?? "",
              arguments: "",
            },
          };
        }

        // Aggregate function arguments
        if (toolCallDelta.function?.arguments) {
          toolCalls[index].function.arguments += toolCallDelta.function
            .arguments as string;
        }

        // Update other properties if they exist
        if (toolCallDelta.id) {
          toolCalls[index].id = toolCallDelta.id;
        }
        if (toolCallDelta.function?.name) {
          toolCalls[index].function.name = toolCallDelta.function.name;
        }
      }
    }
  }

  // If there are tool calls, execute them and continue the conversation
  if (toolCalls.length > 0) {
    // Emit each tool call
    for (const toolCall of toolCalls) {
      gensx.publishData({
        id: `${messageId}_tool_call_${toolCall.id}`,
        role: "assistant",
        delta: `\n\n🔧 **Tool Call**: ${toolCall.function.name}\n**Arguments**: ${toolCall.function.arguments}`,
        type: "tool_call",
        tool_call_id: toolCall.id,
        function_name: toolCall.function.name,
        arguments: toolCall.function.arguments,
      });
    }

    // Add the assistant's message with tool calls to the conversation
    const assistantMessage: ChatCompletionMessageParam = {
      role: "assistant",
      content: text || null,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
    };
    messages.push(assistantMessage);

    // Execute all tool calls
    const toolResults = await Promise.all(
      toolCalls.map(async (toolCall) => {
        try {
          // Parse the arguments
          const args = JSON.parse(toolCall.function.arguments);

          // Execute the tool function
          const functionName = toolCall.function
            .name as keyof typeof toolFunctions;
          const result = await toolFunctions[functionName](args);

          // Emit the tool result
          gensx.publishData({
            id: `${messageId}_tool_result_${toolCall.id}`,
            role: "tool",
            delta: `\n\n📋 **Tool Result** (${toolCall.function.name}): ${result}`,
            type: "tool_result",
            tool_call_id: toolCall.id,
            function_name: toolCall.function.name,
            result: result,
          });

          return {
            tool_call_id: toolCall.id,
            role: "tool" as const,
            content: result,
          };
        } catch (error) {
          console.error(
            `Error executing tool ${toolCall.function.name}:`,
            error,
          );
          const errorMessage = `Error executing ${toolCall.function.name}: ${String(error)}`;

          // Emit the tool error
          gensx.publishData({
            id: `${messageId}_tool_result_${toolCall.id}`,
            role: "tool",
            delta: `\n\n❌ **Tool Error** (${toolCall.function.name}): ${errorMessage}`,
            type: "tool_result",
            tool_call_id: toolCall.id,
            function_name: toolCall.function.name,
            result: errorMessage,
            error: "true",
          });

          return {
            tool_call_id: toolCall.id,
            role: "tool" as const,
            content: errorMessage,
          };
        }
      }),
    );

    // Add tool results to messages
    messages.push(...toolResults);

    // Continue the conversation with tool results
    return await processMessagesWithTools(messages);
  }

  return text;
}

export const OpenAIAgentWorkflow = gensx.Workflow(
  "OpenAIAgentWorkflow",
  async ({ userInput }: { userInput: string }) => {
    return await OpenAIAgent({ userInput });
  },
);
