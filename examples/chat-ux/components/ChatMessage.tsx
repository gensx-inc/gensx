import { Message } from "@/hooks/useChat";
import { ToolMessage } from "./ToolMessage";
import { MarkdownContent } from "./MarkdownContent";

interface ChatMessageProps {
  message: Message;
  messages: Message[]; // Pass all messages to find corresponding tool results
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

type ContentPart = TextPart | ToolCallPart | ToolResultPart;

export function ChatMessage({ message, messages }: ChatMessageProps) {
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
    let hasToolCalls = false;

    if (typeof message.content === "string") {
      // Legacy string content
      textContent = message.content || "";
      hasToolCalls = false;
    } else if (Array.isArray(message.content)) {
      // New array content format
      const contentParts = message.content as ContentPart[];
      const textParts = contentParts.filter(
        (part): part is TextPart => part.type === "text",
      );
      const toolCallParts = contentParts.filter(
        (part): part is ToolCallPart => part.type === "tool-call",
      );

      textContent = textParts.map((part) => part.text).join("");
      hasToolCalls = toolCallParts.length > 0;
    }

    const hasContent = textContent && textContent.trim().length > 0;

    return (
      <div className="flex justify-start mb-4 animate-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[85%] sm:max-w-2xl lg:max-w-3xl space-y-4">
          {/* A. Render Text Content if it exists */}
          {hasContent && (
            <div className="px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
              <MarkdownContent
                content={textContent}
                className="text-sm leading-relaxed text-slate-700"
              />
            </div>
          )}

          {/* B. Render Tool Calls if they exist */}
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
