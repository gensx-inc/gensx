import * as gensx from "@gensx/core";
import { ChatCompletion, OpenAIProvider } from "@gensx/openai";
import { BlobProvider, useBlob } from "@gensx/storage";

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
    <BlobProvider
    //kind="filesystem"
    //rootDir={path.join(process.cwd(), "chat-memory")}
    //kind="cloud"
    >
      <ChatWithMemory userInput={userInput} threadId={threadId} />
    </BlobProvider>
  </OpenAIProvider>
));

// Create the workflow
const ChatMemoryWorkflow = gensx.Workflow(
  "ChatMemoryWorkflow",
  WorkflowComponent,
);

export { ChatMemoryWorkflow };
