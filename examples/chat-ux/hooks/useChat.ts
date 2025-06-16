import { useState, useCallback, useMemo } from "react";

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
  const [messageHistory, setMessageHistory] = useState<Message[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clear = useCallback(() => {
    setMessageHistory([]);
    setCurrentMessages([]);
    setError(null);
  }, []);

  const messages = useMemo(
    () => [...messageHistory, ...currentMessages],
    [messageHistory, currentMessages],
  );

  const sendMessage = useCallback(
    async (prompt: string, threadId: string) => {
      if (!prompt || !threadId) {
        setError("Missing prompt or threadId");
        return;
      }

      setIsLoading(true);
      setError(null);

      // Move any existing current turn messages to confirmed, then add user message
      setMessageHistory((prev) => [...prev, ...currentMessages]);
      setCurrentMessages([]);

      const userMessage: Message = {
        id: Date.now().toString(),
        content: prompt,
        role: "user",
        timestamp: new Date(),
      };
      setMessageHistory((prev) => [...prev, userMessage]);

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
                // Handle new object-based message events
                if (event.type === "object" && event.label === "messages") {
                  if (!hasReceivedFirstChunk) {
                    hasReceivedFirstChunk = true;
                    setIsLoading(false);
                  }

                  // Backend sends only new messages for this turn
                  const newMessages: Message[] = event.data.messages
                    .filter((msg) => msg.role !== "user") // Skip user messages since we already added them
                    .map((msg, index) => ({
                      id: `${event.id}-${index}`,
                      content: msg.content,
                      role: msg.role as "assistant" | "tool",
                      timestamp: new Date(event.timestamp || Date.now()),
                      tool_calls: msg.tool_calls,
                      tool_call_id: msg.tool_call_id,
                    }));

                  // Simply replace current turn messages
                  setCurrentMessages(newMessages);
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
    },
    [currentMessages],
  );

  return {
    sendMessage,
    messages,
    isLoading,
    error,
    clear,
  };
}
