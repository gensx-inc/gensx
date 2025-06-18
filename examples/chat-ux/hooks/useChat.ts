import { useState, useCallback, useMemo } from "react";
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
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [workflowRunId, setWorkflowRunId] = useState<string>("");
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

  const clear = useCallback(() => {
    setMessageHistory([]);
    setCurrentMessages([]);
  }, []);

  const loadHistory = useCallback(async (threadId: string) => {
    if (!threadId) return;

    try {
      const response = await fetch(`/api/chats/${threadId}`);

      if (!response.ok) {
        throw new Error("Failed to load conversation history");
      }

      const history: CoreMessage[] = await response.json();
      setMessageHistory(history);
      setCurrentMessages([]);
    } catch (err) {
      console.error("Error loading conversation history:", err);
    }
  }, []);

  // Convert workflow messages to our Message format
  const currentMessagesFromWorkflow = useMemo(() => {
    if (!messagesProgress?.messages || !workflowRunId) return [];

    // Cast messages to CoreMessage[] for type safety
    const messages = messagesProgress.messages as CoreMessage[];

    return messages.filter((msg: CoreMessage) => msg.role !== "user"); // Skip user messages since we add them locally
  }, [messagesProgress, workflowRunId]);

  // Update current messages when workflow publishes new messages
  useMemo(() => {
    setCurrentMessages(currentMessagesFromWorkflow);
    // Turn off loading as soon as we receive the first message
    if (currentMessagesFromWorkflow.length > 0 && isLoading) {
      setIsLoading(false);
    }
  }, [currentMessagesFromWorkflow, isLoading]);

  const messages = useMemo(
    () => [...messageHistory, ...currentMessages],
    [messageHistory, currentMessages],
  );

  const sendMessage = useCallback(
    async (prompt: string, threadId: string) => {
      if (!prompt || !threadId) {
        return;
      }

      // Create a unique run ID for this workflow execution
      const runId = `${threadId}-${Date.now()}`;
      setWorkflowRunId(runId);
      setIsLoading(true);

      // Move any existing current turn messages to confirmed, then add user message
      setMessageHistory((prev) => [...prev, ...currentMessages]);
      setCurrentMessages([]);

      const userMessage: Message = {
        role: "user",
        content: prompt,
      };
      setMessageHistory((prev) => [...prev, userMessage]);

      // Run the workflow
      await run({
        inputs: {
          prompt: prompt,
          threadId: threadId,
        },
      });
    },
    [currentMessages, run],
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
