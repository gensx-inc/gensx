import { useState, useCallback } from "react";

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
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (prompt: string, threadId: string) => {
    if (!prompt || !threadId) {
      setError("Missing prompt or threadId");
      return;
    }

    setIsLoading(true);
    setError(null);

    // Add user message immediately
    const userMessage: Message = {
      id: Date.now().toString(),
      content: prompt,
      role: "user",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const response = await fetch("/api/gensx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          workflowName: "OpenAIAgentWorkflow",
          inputs: {
            userInput: prompt,
            threadId: threadId,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hasReceivedFirstChunk = false;

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value);
        buffer += chunk;

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.trim()) {
            try {
              const event = JSON.parse(line) as WorkflowProgressEvent;
              console.log("📝 Received event:", event, "🚀");

              // Handle new object-based message events
              if (event.type === "object" && event.label === "messages") {
                if (!hasReceivedFirstChunk) {
                  hasReceivedFirstChunk = true;
                  setIsLoading(false);
                }

                // Convert OpenAI message format to our Message interface
                const convertedMessages: Message[] = event.data.messages.map(
                  (msg, index) => {
                    // Generate unique ID for each message
                    const messageId = `${event.id}-${index}`;

                    return {
                      id: messageId,
                      content: msg.content,
                      role: msg.role as "assistant" | "tool" | "user",
                      timestamp: new Date(event.timestamp || Date.now()),
                      tool_calls: msg.tool_calls,
                      tool_call_id: msg.tool_call_id,
                    };
                  },
                );

                // Replace messages entirely with the new set from the workflow
                setMessages((prev) => {
                  // Keep user messages and only replace assistant/tool messages
                  const userMessages = prev.filter(
                    (msg) => msg.role === "user",
                  );
                  const newMessages = convertedMessages.filter(
                    (msg) => msg.role !== "user",
                  );
                  return [...userMessages, ...newMessages];
                });
              }
            } catch (e) {
              console.error("Error parsing event:", e);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    sendMessage,
    messages,
    isLoading,
    error,
    clear,
  };
}
