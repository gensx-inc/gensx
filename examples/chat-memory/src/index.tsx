import path from "node:path";

import * as gensx from "@gensx/core";
import { ChatCompletion, OpenAIProvider } from "@gensx/openai";

// Define our own chat message type structure that is compatible with OpenAI's API
interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// Props for the chat component that includes the thread ID
interface ChatWithMemoryProps {
  userInput: string;
  threadId: string;
}

// Main chat component that uses memory
const ChatWithMemory = gensx.Component<ChatWithMemoryProps, string>(
  "ChatWithMemory",
  (props) => {
    const { userInput, threadId } = props;

    // This function loads chat history from blob storage
    const loadChatHistory = async (): Promise<ChatMessage[]> => {
      // Get the blob storage for this thread
      const chatHistoryBlob = gensx.useBlob<ChatMessage[]>(`chats/${threadId}`);

      // Try to get existing history
      const history = await chatHistoryBlob.get();

      // If no history exists, initialize with system message
      if (!history) {
        return [
          {
            role: "system",
            content:
              "You are a helpful assistant with memory of past conversations in this thread.",
          },
          {
            role: "user",
            content: `You're having a conversation with thread ID: ${threadId}. Remember this ID for context.`,
          },
          {
            role: "assistant",
            content: `I'll remember that we're in thread ${threadId}.`,
          },
        ];
      }

      return history;
    };

    // Function to save chat history
    const saveChatHistory = async (messages: ChatMessage[]): Promise<void> => {
      const chatHistoryBlob = gensx.useBlob<ChatMessage[]>(`chats/${threadId}`);
      await chatHistoryBlob.put(messages);
    };

    // Use a string return value directly
    const run = async (): Promise<string> => {
      try {
        // Load existing chat history
        const existingMessages = await loadChatHistory();

        // Add the new user message
        const updatedMessages = [
          ...existingMessages,
          { role: "user", content: userInput } as ChatMessage,
        ];

        // Properly type the messages for OpenAI API
        const result = await ChatCompletion.run({
          model: "gpt-4o-mini",
          messages: updatedMessages,
        });

        // The result should already be a string from ChatCompletion.run()
        const response = result;

        // Add the assistant's response to the history
        const finalMessages = [
          ...updatedMessages,
          { role: "assistant", content: response } as ChatMessage,
        ];

        // Save the updated chat history
        await saveChatHistory(finalMessages);

        console.log(
          `[Thread ${threadId}] Chat history updated with new messages`,
        );

        return response;
      } catch (error) {
        console.error("Error in chat processing:", error);
        return `Error processing your request in thread ${threadId}. Please try again.`;
      }
    };

    return run();
  },
);

// Main workflow component
const WorkflowComponent = gensx.Component<
  { userInput: string; threadId: string },
  string
>("Workflow", ({ userInput, threadId }) => (
  <OpenAIProvider apiKey={process.env.OPENAI_API_KEY}>
    <gensx.BlobProvider
      kind="filesystem"
      rootDir={path.join(process.cwd(), "chat-memory")}
    >
      <ChatWithMemory userInput={userInput} threadId={threadId} />
    </gensx.BlobProvider>
  </OpenAIProvider>
));

// Create the workflow
const workflow = gensx.Workflow("ChatMemoryWorkflow", WorkflowComponent);

// Run the workflow with a specific thread ID
const threadId = process.argv[2] || "default-thread";
const userInput =
  process.argv[3] || "Hi there! Tell me something interesting about my thread.";

console.log(`Using thread: ${threadId}`);
console.log(`User input: ${userInput}`);

const result = await workflow.run(
  {
    userInput,
    threadId,
  },
  { printUrl: true },
);

console.log("\nAssistant response:");
console.log(result);
