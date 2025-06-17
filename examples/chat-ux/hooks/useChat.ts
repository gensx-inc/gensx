import { useState, useCallback, useMemo } from "react";
import { useWorkflow, useObject } from "@gensx/react";
import { JsonValue } from "@gensx/core";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Workflow input/output types
export interface ChatWorkflowInput {
  userInput: string;
  threadId: string;
}

export interface ChatWorkflowOutput {
  messages: ChatCompletionMessageParam[];
}

// Message progress object type
export interface MessagesProgress extends Record<string, JsonValue> {
  messages: Array<{
    role: "assistant" | "tool" | "user";
    content: string | null;
    tool_calls?: Array<{
      id: string;
      type: "function";
      function: {
        name: string;
        arguments: string;
      };
    }>;
    tool_call_id?: string;
  }>;
}

export type WorkflowProgressEvent = { id: string; timestamp: string } & (
  | { type: "start"; workflowExecutionId?: string; workflowName: string }
  | {
      type: "component-start";
      componentName: string;
      label?: string;
      componentId: string;
    }
  | {
      type: "component-end";
      componentName: string;
      label?: string;
      componentId: string;
    }
  | {
      type: "object";
      label: string;
      data: {
        messages: Array<{
          role: "assistant" | "tool" | "user";
          content: string | null;
          tool_calls?: Array<{
            id: string;
            type: "function";
            function: {
              name: string;
              arguments: string;
            };
          }>;
          tool_call_id?: string;
        }>;
      };
    }
  | { type: "error"; error: string }
  | { type: "end" }
);

export interface Message {
  id: string;
  content: string | null;
  role: "user" | "assistant" | "tool";
  timestamp: Date;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
  tool_call_id?: string;
}

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
  const messagesProgress = useObject<MessagesProgress>(execution, "messages");

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

      const history = await response.json();

      // Convert the OpenAI message format to our Message format
      const convertedMessages: Message[] = history.map(
        (msg: ChatCompletionMessageParam, index: number) => ({
          id: `${threadId}-${index}`,
          content: typeof msg.content === "string" ? msg.content : null,
          role: msg.role as "user" | "assistant" | "tool",
          timestamp: new Date(), // We don't have timestamps in stored history
          tool_calls: "tool_calls" in msg ? msg.tool_calls : undefined,
          tool_call_id: "tool_call_id" in msg ? msg.tool_call_id : undefined,
        }),
      );

      setMessageHistory(convertedMessages);
      setCurrentMessages([]);
    } catch (err) {
      console.error("Error loading conversation history:", err);
    }
  }, []);

  // Convert workflow messages to our Message format
  const currentMessagesFromWorkflow = useMemo(() => {
    if (!messagesProgress?.messages || !workflowRunId) return [];

    return messagesProgress.messages
      .filter((msg: MessagesProgress["messages"][0]) => msg.role !== "user") // Skip user messages since we add them locally
      .map((msg: MessagesProgress["messages"][0], index: number) => ({
        id: `${workflowRunId}-${msg.role}-${index}-${Date.now()}`, // More unique key
        content: msg.content,
        role: msg.role as "assistant" | "tool",
        timestamp: new Date(),
        tool_calls: msg.tool_calls,
        tool_call_id: msg.tool_call_id,
      }));
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
        id: `${runId}-user`,
        content: prompt,
        role: "user",
        timestamp: new Date(),
      };
      setMessageHistory((prev) => [...prev, userMessage]);

      // Run the workflow
      await run({
        inputs: {
          userInput: prompt,
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
