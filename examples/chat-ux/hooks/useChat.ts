import { useState, useCallback, useEffect } from "react";
import { useWorkflow, useObject } from "@gensx/react";
import { JsonValue } from "@gensx/core";
import { CoreMessage, TextPart, ToolCallPart } from "ai";

// Workflow input/output types
export interface ChatWorkflowInput {
  prompt: string;
  threadId: string;
  userId: string;
}

export interface ChatWorkflowOutput {
  response: string;
  messages: CoreMessage[];
}

export type ChatStatus = "completed" | "waiting" | "reasoning" | "streaming";

// Just use CoreMessage directly
export type Message = CoreMessage;

interface UseChatReturn {
  sendMessage: (
    prompt: string,
    threadId: string,
    userId: string,
  ) => Promise<void>;
  messages: Message[];
  status: ChatStatus;
  error: string | null;
  clear: () => void;
  loadHistory: (threadId: string, userId: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ChatStatus>("completed");

  // Use the workflow hook
  const {
    error: workflowError,
    execution,
    run,
  } = useWorkflow<ChatWorkflowInput, ChatWorkflowOutput>({
    config: {
      baseUrl: "/api/gensx/Chat",
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
      const lastMessage = workflowMessages[workflowMessages.length - 1];

      if (status === "waiting" || status === "reasoning") {
        if (lastMessage && Array.isArray(lastMessage.content)) {
          const hasText = lastMessage.content.some(
            (p): p is TextPart => p.type === "text",
          );
          const hasToolCall = lastMessage.content.some(
            (p): p is ToolCallPart => p.type === "tool-call",
          );
          const hasReasoning = lastMessage.content.some(
            (p) => p.type === "reasoning",
          );

          if (hasText || hasToolCall) {
            setStatus("streaming");
          } else if (hasReasoning) {
            setStatus("reasoning");
          }
        } else if (
          lastMessage &&
          typeof lastMessage.content === "string" &&
          lastMessage.content
        ) {
          // If content is a non-empty string, we are streaming
          setStatus("streaming");
        }
      }

      setMessages((prev) => {
        // Find the last user message to determine where to insert workflow messages
        const lastUserIndex = prev.findLastIndex((msg) => msg.role === "user");
        if (lastUserIndex === -1) return prev;

        // Replace any existing assistant messages after the last user message
        const messagesBeforeAssistant = prev.slice(0, lastUserIndex + 1);
        return [...messagesBeforeAssistant, ...workflowMessages];
      });
    }
  }, [messagesProgress, execution, status]);

  const clear = useCallback(() => {
    setMessages([]);
    setStatus("completed");
  }, []);

  const loadHistory = useCallback(async (threadId: string, userId: string) => {
    if (!threadId || !userId) return;

    try {
      const response = await fetch(`/api/chats/${userId}/${threadId}`);
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
    async (prompt: string, threadId: string, userId: string) => {
      if (!prompt || !threadId || !userId) return;

      setStatus("waiting");

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
          userId: userId,
        },
      });
      setStatus("completed");
    },
    [run],
  );

  return {
    sendMessage,
    messages,
    status,
    error: workflowError,
    clear,
    loadHistory,
  };
}
