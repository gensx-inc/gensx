"use client";

import React, { useState, useRef, useEffect } from "react";
import { CoreAssistantMessage, CoreMessage, CoreUserMessage } from "ai";

import { useChat } from "../../hooks/useChat";
import { useRouter } from "next/navigation";
import { useToolImplementations } from "./tool-implementations";
import { useCopilotThreadId, useCopilotUserId } from "./hooks";

export default function GenSXCopilot() {
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useCopilotUserId();
  const [threadId, setThreadId] = useCopilotThreadId();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const toolImplementations = useToolImplementations();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const {
    messages,
    sendMessage,
    status,
    error,
    loadHistory,
    // clear
  } = useChat(toolImplementations);

  // Initialize user ID, and load chat history on mount
  useEffect(() => {
    loadHistory(threadId, userId);
    setUserId(userId);
    setThreadId(threadId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "streaming") {
      inputRef.current?.focus();
    }
  }, [status]);

  // const clearThreadId = () => {
  //   setThreadId(Date.now().toString());
  //   clear();
  // };

  // const clearUserId = () => {
  //   setUserId(crypto.randomUUID());
  // };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || (status === "streaming" && !error)) return;

    let currentThreadId = threadId;
    if (!currentThreadId) {
      currentThreadId = Date.now().toString();
      router.push(`?copilotThreadId=${currentThreadId}`);
    }

    const userMessage = input;
    setInput("");
    await sendMessage(
      userMessage,
      currentThreadId ?? undefined,
      userId ?? undefined,
    );
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 z-50 flex items-center justify-center"
        aria-label="Toggle Copilot"
      >
        {isOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        )}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-96 h-[600px] bg-white rounded-lg shadow-2xl z-50 flex flex-col">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg">
            <h3 className="font-semibold">GenSX Copilot</h3>
            <p className="text-sm opacity-90">
              I can help you interact with this page
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message, index) =>
              formatMessageContent(
                index,
                message,
                messages,
                expandedTools,
                setExpandedTools,
              ),
            )}
            {error && (
              <div className="bg-red-100 text-red-700 p-3 rounded-lg">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me to interact with the page..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={status === "streaming" && !error}
                ref={inputRef}
              />
              <button
                type="submit"
                disabled={status === "streaming" && !error}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "streaming" && !error ? "..." : "Send"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function formatMessageContent(
  index: number,
  message: CoreMessage,
  messages: CoreMessage[],
  expandedTools: Set<string>,
  setExpandedTools: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  if (message.role === "system" || message.role === "tool") {
    return null;
  }

  if (message.role === "user") {
    return formatUserContent(index, message);
  }
  return formatAssistantContent(
    index,
    message,
    messages,
    expandedTools,
    setExpandedTools,
  );
}

function formatUserContent(index: number, message: CoreUserMessage) {
  const content =
    typeof message.content === "string"
      ? message.content
      : message.content
          .map((part) => {
            if ("text" in part) {
              return part.text;
            }
            if (typeof part === "string") {
              return part;
            }
            return "";
          })
          .join("");

  return (
    <div key={index} className="flex justify-end">
      <div className="max-w-[80%] p-3 rounded-lg bg-blue-600 text-white">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function formatAssistantContent(
  index: number,
  message: CoreAssistantMessage,
  messages: CoreMessage[],
  expandedTools: Set<string>,
  setExpandedTools: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
  if (typeof message.content === "string") {
    return <div key={index}>{message.content}</div>;
  }
  const toolResults = messages.flatMap((m) => {
    if (m.role === "tool") {
      return m.content;
    }
    return [];
  });

  let textContent = "";
  const toolCalls: {
    toolCallId: string;
    toolName: string;
    args: unknown;
    result?: unknown;
  }[] = [];
  for (const part of message.content) {
    if ("text" in part) {
      textContent += part.text;
    } else if (typeof part === "string") {
      textContent += part;
    } else if (part.type === "tool-call") {
      const result = toolResults.find((r) => r.toolCallId === part.toolCallId);

      toolCalls.push({
        toolCallId: part.toolCallId,
        toolName: part.toolName,
        args: part.args,
        result: result?.result,
      });
    }
  }
  const toggleTool = (toolCallId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolCallId)) {
        newSet.delete(toolCallId);
      } else {
        newSet.add(toolCallId);
      }
      return newSet;
    });
  };

  return (
    <div key={index} className="flex justify-start">
      <div className="max-w-[80%] p-3 rounded-lg bg-gray-100 text-gray-800">
        {textContent && (
          <p className="whitespace-pre-wrap mb-2">{textContent}</p>
        )}
        {toolCalls.length > 0 && (
          <div className="space-y-2">
            {toolCalls.map((call) => {
              const isExpanded = expandedTools.has(call.toolCallId);
              return (
                <div
                  key={call.toolCallId}
                  className="border border-gray-300 rounded-md overflow-hidden"
                >
                  <button
                    onClick={() => toggleTool(call.toolCallId)}
                    className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-sm"
                  >
                    <span className="font-medium">{call.toolName}</span>
                    <svg
                      className={`w-4 h-4 transition-transform ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  {isExpanded && (
                    <div className="p-3 bg-white border-t border-gray-300">
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">
                            Input:
                          </p>
                          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(call.args, null, 2)}
                          </pre>
                        </div>
                        {call.result !== undefined && (
                          <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">
                              Output:
                            </p>
                            <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                              {JSON.stringify(call.result, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
