import * as gensx from "@gensx/core";
import { Agent } from "./agent";
import { CoreMessage } from "ai";
import { webSearchTool } from "./tools/webSearch";
import { useBlob } from "@gensx/storage";
import { openai } from "@ai-sdk/openai";
import { asToolSet } from "@gensx/vercel-ai";
import { toolbox } from "./tools/frontendTools";
import { geocodeTool } from "./tools/geocode";

interface ChatAgentProps {
  prompt: string;
  threadId: string;
  userId: string;
  thinking?: boolean;
}

export const ChatAgent = gensx.Workflow(
  "MapAgent",
  async ({ prompt, threadId, userId }: ChatAgentProps) => {
    // Get blob instance for chat history storage
    const chatHistoryBlob = useBlob<CoreMessage[]>(
      `chat-history/${userId}/${threadId}.json`,
    );

    // Function to load chat history
    const loadChatHistory = async (): Promise<CoreMessage[]> => {
      const history = await chatHistoryBlob.getJSON();
      return history ?? [];
    };

    // Function to save chat history
    const saveChatHistory = async (messages: CoreMessage[]): Promise<void> => {
      await chatHistoryBlob.putJSON(messages);
    };

    try {
      // Load existing chat history
      const existingMessages = await loadChatHistory();

      // Add the new user message
      const messages: CoreMessage[] = [
        ...existingMessages,
        {
          role: "user",
          content: prompt,
        },
      ];

      const tools = {
        webSearch: webSearchTool,
        geocode: geocodeTool,
        ...asToolSet(toolbox),
      };

      const model = openai("gpt-4o-mini");
      const result = await Agent({
        messages,
        tools,
        model,
        // providerOptions: thinking
        //   ? {
        //       anthropic: {
        //         thinking: { type: "enabled", budgetTokens: 12000 },
        //       } satisfies AnthropicProviderOptions,
        //     }
        //   : undefined,
      });

      // Save the complete conversation history
      await saveChatHistory([...messages, ...result.messages]);

      return result;
    } catch (error) {
      console.error("Error in chat processing:", error);
      return {
        response: `Error processing your request in thread ${threadId}. Please try again.`,
        messages: [],
      };
    }
  },
);
