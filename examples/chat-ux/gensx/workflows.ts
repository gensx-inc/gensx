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
      const searchResult = await app.search(query, { limit });

      if (!searchResult.success) {
        return `Search failed: ${searchResult.error ?? "Unknown error"}`;
      }

      const results = searchResult.data.map(
        (result, index) =>
          `${index + 1}. **${result.title ?? "No title"}**\n   ${result.description ?? "No description"}\n   ${result.url ?? ""}`,
      );

      return `Found ${results.length} results for "${query}":\n\n${results.join("\n\n")}`;
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
  inputMessages: ChatCompletionMessageParam[],
  responseMessages: ChatCompletionMessageParam[] = [],
): Promise<ChatCompletionMessageParam[]> {
  const result = await openai.chat.completions.create({
    messages: inputMessages,
    model: "gpt-4.1-mini",
    stream: true,
    tools,
  });

  let text = "";
  const toolCalls: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }> = [];

  // Add initial assistant message
  const assistantMessage: ChatCompletionMessageParam = {
    role: "assistant",
    content: "",
  };
  responseMessages.push(assistantMessage);

  const publishMessages = () => {
    gensx.publishObject("messages", {
      messages: JSON.parse(JSON.stringify(responseMessages)),
    });
  };

  for await (const chunk of result) {
    const delta = chunk.choices[0].delta;

    // Handle content streaming
    if (delta.content) {
      text += delta.content;
      assistantMessage.content = text;
      publishMessages();
    }

    // Handle tool call streaming
    if (delta.tool_calls) {
      for (const toolCallDelta of delta.tool_calls) {
        const index = toolCallDelta.index!;

        // Initialize tool call if needed
        if (!toolCalls[index]) {
          toolCalls[index] = {
            id: toolCallDelta.id ?? "",
            type: "function",
            function: {
              name: toolCallDelta.function?.name ?? "",
              arguments: "",
            },
          };
        }

        // Accumulate arguments
        if (toolCallDelta.function?.arguments && toolCalls[index]) {
          toolCalls[index].function.arguments +=
            toolCallDelta.function.arguments;
        }

        // Update other properties
        if (toolCallDelta.id && toolCalls[index])
          toolCalls[index].id = toolCallDelta.id;
        if (toolCallDelta.function?.name && toolCalls[index])
          toolCalls[index].function.name = toolCallDelta.function.name;
      }
    }
  }

  // Handle tool calls if present
  if (toolCalls.length > 0) {
    // Update assistant message with tool calls
    assistantMessage.content = text || null;
    assistantMessage.tool_calls = toolCalls.map((tc) => ({
      id: tc.id,
      type: "function" as const,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    }));

    publishMessages();
    inputMessages.push({ ...assistantMessage });

    // Execute tool calls
    const toolResults = await Promise.all(
      toolCalls.map(async (toolCall) => {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const functionName = toolCall.function
            .name as keyof typeof toolFunctions;
          const result = await toolFunctions[functionName](args);

          return {
            tool_call_id: toolCall.id,
            role: "tool" as const,
            content: result,
          };
        } catch (error) {
          return {
            tool_call_id: toolCall.id,
            role: "tool" as const,
            content: `Error executing ${toolCall.function.name}: ${String(error)}`,
          };
        }
      }),
    );

    // Add tool results to messages
    inputMessages.push(...toolResults);
    responseMessages.push(...toolResults);
    publishMessages();

    // Continue conversation with tool results
    return await processMessagesWithTools(inputMessages, responseMessages);
  }

  return responseMessages;
}

export const OpenAIAgentWorkflow = gensx.Workflow(
  "OpenAIAgentWorkflow",
  async ({ userInput }: { userInput: string }) => {
    return await OpenAIAgent({ userInput });
  },
);
