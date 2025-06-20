import { Message, ChatStatus } from "@/hooks/useChat";
import { ToolMessage } from "./ToolMessage";
import { MarkdownContent } from "./MarkdownContent";
import { useState } from "react";
import { ChevronRight, ChevronDown, Brain, Loader2 } from "lucide-react";

interface ChatMessageProps {
  message: Message;
  messages: Message[]; // Pass all messages to find corresponding tool results
  status: ChatStatus;
}

interface TextPart {
  type: "text";
  text: string;
}

interface ToolCallPart {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: unknown;
}

interface ToolResultPart {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: string;
}

interface ReasoningPart {
  type: "reasoning";
  text: string;
}

type ContentPart = TextPart | ToolCallPart | ToolResultPart | ReasoningPart;

// Component for rendering reasoning/thinking content
function ReasoningContent({
  content,
  isThinking,
}: {
  content: string;
  isThinking?: boolean;
}) {
  // Manual expand/collapse only
  const [isExpanded, setIsExpanded] = useState(true);

  if (!content || content.trim().length === 0) {
    return null;
  }

  return (
    <div className="flex justify-center">
      <div className="max-w-[85%] sm:max-w-2xl lg:max-w-3xl w-full">
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 py-2 hover:opacity-80 transition-opacity duration-200 w-full text-left"
          >
            {isThinking ? (
              <Loader2 size={14} className="text-slate-400 animate-spin" />
            ) : (
              <Brain size={14} className="text-slate-400" />
            )}
            <span
              className={
                isThinking
                  ? "text-slate-500 text-sm italic font-medium bg-gradient-to-r from-slate-500 via-slate-600 to-slate-500 bg-clip-text text-transparent animate-pulse bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]"
                  : "text-sm font-medium text-slate-500 italic"
              }
            >
              {isThinking ? "Thinking..." : "Thought for a few seconds"}
            </span>

            {isExpanded ? (
              <ChevronDown size={14} className="text-slate-400" />
            ) : (
              <ChevronRight size={14} className="text-slate-400" />
            )}
          </button>
          {isExpanded && (
            <div className="mt-2 mb-4">
              <div className="border-l-2 border-slate-300 ml-2 pl-3 text-sm text-slate-500 whitespace-pre-wrap break-words leading-relaxed">
                {content}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatMessage({ message, messages, status }: ChatMessageProps) {
  // --- Role-based Rendering ---

  // 1. User Messages
  if (message.role === "user") {
    // Handle both string and array content for user messages
    const userContent =
      typeof message.content === "string"
        ? message.content
        : Array.isArray(message.content)
          ? message.content
              .filter((part): part is TextPart => part.type === "text")
              .map((part) => part.text)
              .join("")
          : "";

    return (
      <div className="flex justify-end mb-4 animate-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[80%] sm:max-w-lg lg:max-xl">
          <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 text-white shadow-lg">
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">
              {userContent}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Assistant Messages
  if (message.role === "assistant") {
    // Handle content as either string or array of content parts
    let textContent = "";
    let reasoningContent = "";
    let hasToolCalls = false;

    if (typeof message.content === "string") {
      // Legacy string content
      textContent = message.content || "";
    } else if (Array.isArray(message.content)) {
      // New array content format
      const contentParts = message.content as ContentPart[];
      const textParts = contentParts.filter(
        (part): part is TextPart => part.type === "text",
      );
      const reasoningParts = contentParts.filter(
        (part): part is ReasoningPart => part.type === "reasoning",
      );
      const toolCallParts = contentParts.filter(
        (part): part is ToolCallPart => part.type === "tool-call",
      );

      textContent = textParts.map((part) => part.text).join("");
      reasoningContent = reasoningParts.map((part) => part.text).join("");
      hasToolCalls = toolCallParts.length > 0;
    }

    const hasContent = textContent && textContent.trim().length > 0;
    const hasReasoning = reasoningContent && reasoningContent.trim().length > 0;

    // Check if reasoning is actively being streamed
    // This happens when we have reasoning content and either:
    // 1. The message is currently streaming, OR
    // 2. The reasoning content exists but there's no text content yet (reasoning is streaming first)
    const isReasoningActive = status === "reasoning";

    return (
      <div className="flex justify-start mb-4 animate-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[85%] sm:max-w-2xl lg:max-w-3xl space-y-3">
          {/* A. Render Reasoning Content if it exists */}
          {hasReasoning && (
            <ReasoningContent
              content={reasoningContent}
              isThinking={isReasoningActive}
            />
          )}

          {/* B. Render Text Content if it exists */}
          {hasContent && (
            <div>
              <MarkdownContent
                content={textContent}
                className="text-sm leading-relaxed text-slate-800"
              />
            </div>
          )}

          {/* C. Render Tool Calls if they exist */}
          {hasToolCalls && (
            <ToolMessage message={message} messages={messages} />
          )}
        </div>
      </div>
    );
  }

  // 3. Tool Messages (should not be rendered directly)
  if (message.role === "tool") {
    // These are rendered inside ToolMessage, so we don't render them here.
    return null;
  }

  // Fallback for any other message types
  return null;
}
