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
  | { type: "progress"; action: string; content: string; messageId: string }
  | {
      type: "progress";
      role: "assistant" | "tool";
      delta: string;
      messageId?: string;
      id: string;
    }
  | {
      type: "tool_call";
      role: "assistant";
      delta: string;
      id: string;
      tool_call_id: string;
      function_name: string;
      arguments: string;
    }
  | {
      type: "tool_result";
      role: "tool";
      delta: string;
      id: string;
      tool_call_id: string;
      function_name: string;
      result: string;
      error?: string;
    }
  | { type: "error"; error: string }
  | { type: "end" }
);

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant" | "tool";
  timestamp: Date;
  tool_call_id?: string;
  function_name?: string;
  arguments?: string;
  result?: string;
  isError?: boolean;
  messageType?: "regular" | "tool_call" | "tool_result" | "tool_complete";
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
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({ userInput: prompt, threadId }),
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

              // Handle regular progress events (old format)
              if (
                event.type === "progress" &&
                "content" in event &&
                event.content
              ) {
                if (!hasReceivedFirstChunk) {
                  hasReceivedFirstChunk = true;
                  setIsLoading(false);
                }

                setMessages((prev) => {
                  const existingMessageIndex = prev.findIndex(
                    (msg) => msg.id === event.messageId,
                  );

                  if (existingMessageIndex === -1) {
                    return [
                      ...prev,
                      {
                        id: event.messageId,
                        content: event.content,
                        role: "assistant" as const,
                        timestamp: new Date(event.timestamp || Date.now()),
                        messageType: "regular" as const,
                      },
                    ];
                  }

                  return prev.map((msg, index) => {
                    if (index === existingMessageIndex) {
                      return {
                        ...msg,
                        content: msg.content + event.content,
                      };
                    }
                    return msg;
                  });
                });
              }

              // Handle new progress events with delta
              if (
                event.type === "progress" &&
                "delta" in event &&
                event.delta
              ) {
                if (!hasReceivedFirstChunk) {
                  hasReceivedFirstChunk = true;
                  setIsLoading(false);
                }

                setMessages((prev) => {
                  const existingMessageIndex = prev.findIndex(
                    (msg) => msg.id === event.id,
                  );

                  if (existingMessageIndex === -1) {
                    return [
                      ...prev,
                      {
                        id: event.id,
                        content: event.delta,
                        role: event.role,
                        timestamp: new Date(event.timestamp || Date.now()),
                        messageType: "regular" as const,
                      },
                    ];
                  }

                  return prev.map((msg, index) => {
                    if (index === existingMessageIndex) {
                      return {
                        ...msg,
                        content: msg.content + event.delta,
                      };
                    }
                    return msg;
                  });
                });
              }

              // Handle tool call events
              if (event.type === "tool_call") {
                if (!hasReceivedFirstChunk) {
                  hasReceivedFirstChunk = true;
                  setIsLoading(false);
                }

                setMessages((prev) => [
                  ...prev,
                  {
                    id: event.tool_call_id,
                    content: event.delta,
                    role: "assistant" as const,
                    timestamp: new Date(event.timestamp || Date.now()),
                    tool_call_id: event.tool_call_id,
                    function_name: event.function_name,
                    arguments: event.arguments,
                    messageType: "tool_call" as const,
                  },
                ]);
              }

              // Handle tool result events
              if (event.type === "tool_result") {
                if (!hasReceivedFirstChunk) {
                  hasReceivedFirstChunk = true;
                  setIsLoading(false);
                }

                setMessages((prev) => {
                  const existingCallIndex = prev.findIndex(
                    (msg) =>
                      msg.tool_call_id === event.tool_call_id &&
                      msg.messageType === "tool_call",
                  );

                  if (existingCallIndex !== -1) {
                    return prev.map((msg, index) => {
                      if (index === existingCallIndex) {
                        return {
                          ...msg,
                          result: event.result,
                          isError: event.error === "true",
                          messageType: "tool_complete" as const,
                        };
                      }
                      return msg;
                    });
                  }

                  return [
                    ...prev,
                    {
                      id: event.id,
                      content: event.delta,
                      role: "tool" as const,
                      timestamp: new Date(event.timestamp || Date.now()),
                      tool_call_id: event.tool_call_id,
                      function_name: event.function_name,
                      result: event.result,
                      isError: event.error === "true",
                      messageType: "tool_result" as const,
                    },
                  ];
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
