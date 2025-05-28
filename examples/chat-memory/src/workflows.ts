import * as gensx from "@gensx/core";
import { generateText } from "@gensx/vercel-ai";
import { BlobClient } from "@gensx/storage";
import { openai } from "@ai-sdk/openai";

// Define our own chat message type structure that is compatible with OpenAI's API
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// TODO: remove this once the storage package is updated
async function useBlob<T>(path: string) {
  const client = new BlobClient();
  return client.getBlob<T>(path);
}

export const ChatWithMemory = gensx.Component(
  "ChatWithMemory",
  async ({ userInput, threadId }: { userInput: string; threadId: string }): Promise<string> => {
    // Function to load chat history
    const loadChatHistory = async (): Promise<ChatMessage[]> => {
      const blob = await useBlob<ChatMessage[]>(`chat-history/${threadId}.json`);
      const history = await blob.getJSON();
      return history ?? [];
    };

    // Function to save chat history
    const saveChatHistory = async (messages: ChatMessage[]): Promise<void> => {
      const blob = await useBlob<ChatMessage[]>(`chat-history/${threadId}.json`);
      await blob.putJSON(messages);
    };

    try {
      // Load existing chat history
      const existingMessages = await loadChatHistory();

      // Add the new user message
      const updatedMessages = [
        ...existingMessages,
        { role: "user", content: userInput } as ChatMessage,
      ];

      // Generate response using the new model
      const result = await generateText({
        messages: updatedMessages,
        model: openai("gpt-4.1-mini"),
      });

      // Add the assistant's response to the history
      const finalMessages = [
        ...updatedMessages,
        { role: "assistant", content: result.text } as ChatMessage,
      ];

      // Save the updated chat history
      await saveChatHistory(finalMessages);

      console.log(`[Thread ${threadId}] Chat history updated with new messages`);

      return result.text;
    } catch (error) {
      console.error("Error in chat processing:", error);
      return `Error processing your request in thread ${threadId}. Please try again.`;
    }
  });

export const ChatMemoryWorkflow = gensx.Workflow(
  "ChatMemoryWorkflow",
  async ({ userInput, threadId }: { userInput: string; threadId: string }) => {
    return await ChatWithMemory({ userInput, threadId });
  },
);
