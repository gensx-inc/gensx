import { openai } from "@ai-sdk/openai";
import * as gensx from "@gensx/core";
import { useBlob } from "@gensx/storage";
import { streamText } from "@gensx/vercel-ai";

// Define our own chat message type structure that is compatible with OpenAI's API
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatState {
  messages: ChatMessage[];
}

export const ChatWithMemory = gensx.Component(
  "ChatWithMemory",
  async ({
    userInput,
    threadId,
  }: {
    userInput: string;
    threadId: string;
  }): Promise<string> => {
    const workflowState = gensx.workflowState<ChatState>("ChatState", {
      messages: [],
    });

    // Function to load chat history
    const loadChatHistory = async (): Promise<ChatMessage[]> => {
      const blob = useBlob<ChatMessage[]>(`chat-history/${threadId}.json`);
      const history = await blob.getJSON();
      return history ?? [];
    };

    // Function to save chat history
    const saveChatHistory = async (messages: ChatMessage[]): Promise<void> => {
      const blob = useBlob<ChatMessage[]>(`chat-history/${threadId}.json`);
      await blob.putJSON(messages);
    };

    try {
      console.log("made it here");
      // Load existing chat history
      const existingMessages = await loadChatHistory();

      // Add the new user message
      const updatedMessages = [
        ...existingMessages,
        { role: "user", content: userInput } as ChatMessage,
      ];

      // Generate response using the new model
      const result = await streamText({
        messages: updatedMessages,
        model: openai("gpt-4.1-mini"),
      });

      let assistantMessage = "";
      for await (const chunk of result.textStream) {
        assistantMessage += chunk;
        workflowState.update((state) => {
          // If the last message is an assistant message, append to it
          if (
            state.messages.length > 0 &&
            state.messages[state.messages.length - 1].role === "assistant"
          ) {
            return {
              ...state,
              messages: state.messages.map((msg, idx) =>
                idx === state.messages.length - 1
                  ? { ...msg, content: assistantMessage }
                  : msg,
              ),
            };
          } else {
            // Otherwise, add a new assistant message
            return {
              ...state,
              messages: [
                ...state.messages,
                { role: "assistant", content: assistantMessage },
              ],
            };
          }
        });
      }

      // Add the assistant's response to the history
      const finalMessages = [
        ...updatedMessages,
        { role: "assistant", content: assistantMessage } as ChatMessage,
      ];

      // Save the updated chat history
      await saveChatHistory(finalMessages);

      console.log(
        `[Thread ${threadId}] Chat history updated with new messages`,
      );

      return assistantMessage;
    } catch (error) {
      console.error("Error in chat processing:", error);
      return `Error processing your request in thread ${threadId}. Please try again.`;
    }
  },
);

export const ChatMemoryWorkflow = gensx.Workflow(
  "ChatMemoryWorkflow",
  async ({ userInput, threadId }: { userInput: string; threadId: string }) => {
    return await ChatWithMemory({ userInput, threadId });
  },
);
