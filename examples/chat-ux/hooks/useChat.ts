import { useState, useCallback, useEffect } from "react";
import { useWorkflow, useObject } from "@gensx/react";
import { JsonValue } from "@gensx/core";
import { CoreMessage } from "ai";

// Workflow input/output types
export interface ChatWorkflowInput {
  prompt: string;
  threadId: string;
}

export interface ChatWorkflowOutput {
  response: string;
  messages: CoreMessage[];
}

// Just use CoreMessage directly
export type Message = CoreMessage;

interface UseChatReturn {
  sendMessage: (prompt: string, threadId: string) => Promise<void>;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  clear: () => void;
  loadHistory: (threadId: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Use the workflow hook
  const {
    error: workflowError,
    execution,
    run,
  } = useWorkflow<ChatWorkflowInput, ChatWorkflowOutput>({
    config: {
      baseUrl: "/api/gensx",
    },
  });

  // Get real-time message updates from the workflow
  const messagesProgress = useObject<Record<string, JsonValue>>(
    execution,
    "messages",
  );

  // Update messages when workflow publishes new messages
  useEffect(() => {
    if (messagesProgress?.messages && execution?.length > 0) {
      const workflowMessages = messagesProgress.messages as CoreMessage[];

      setMessages((prev) => {
        // Find the last user message to determine where to insert workflow messages
        const lastUserIndex = prev.findLastIndex((msg) => msg.role === "user");
        if (lastUserIndex === -1) return prev;

        // Replace any existing assistant messages after the last user message
        const messagesBeforeAssistant = prev.slice(0, lastUserIndex + 1);
        return [...messagesBeforeAssistant, ...workflowMessages];
      });

      // Turn off loading when we receive workflow messages
      if (workflowMessages.length > 0) {
        setIsLoading(false);
      }
    }
  }, [messagesProgress, execution]);

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  const loadHistory = useCallback(async (threadId: string) => {
    if (!threadId) return;

    try {
      const response = await fetch(`/api/chats/${threadId}`);
      if (!response.ok) {
        throw new Error("Failed to load conversation history");
      }

      const history: CoreMessage[] = await response.json();
      setMessages(history);
    } catch (err) {
      console.error("Error loading conversation history:", err);
    }
  }, []);

  const sendMessage = useCallback(
    async (prompt: string, threadId: string) => {
      if (!prompt || !threadId) return;

      setIsLoading(true);

      // Add user message immediately
      const userMessage: Message = {
        role: "user",
        content: prompt,
      };
      setMessages((prev) => [...prev, userMessage]);

      // Run the workflow
      await run({
        inputs: {
          prompt: prompt,
          threadId: threadId,
        },
      });
    },
    [run],
  );

  return {
    sendMessage,
    messages,
    isLoading,
    error: workflowError,
    clear,
    loadHistory,
  };
}
