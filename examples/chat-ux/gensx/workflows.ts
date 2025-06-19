import * as gensx from "@gensx/core";
import { Agent } from "./agent";
import { CoreMessage } from "ai";
import { webSearchTool } from "./tools/webSearch";
import { scrapePageTool } from "./tools/scrapePage";
import { useBlob } from "@gensx/storage";

interface ChatAgentProps {
  prompt: string;
  threadId: string;
}

export const ChatAgent = gensx.Workflow(
  "ChatAgent",
  async ({ prompt, threadId }: ChatAgentProps) => {
    // Get blob instance for chat history storage
    const chatHistoryBlob = useBlob<CoreMessage[]>(
      `chat-history/${threadId}.json`,
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
        web_search: webSearchTool,
        scrape_page: scrapePageTool,
      };

      const result = await Agent({ messages, tools });

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
