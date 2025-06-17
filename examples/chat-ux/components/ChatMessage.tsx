import { Message } from "@/hooks/useChat";
import { ToolMessage } from "./ToolMessage";
import { MarkdownContent } from "./MarkdownContent";

interface ChatMessageProps {
  message: Message;
  messages: Message[]; // Pass all messages to find corresponding tool results
}

export function ChatMessage({ message, messages }: ChatMessageProps) {
  // --- Role-based Rendering ---

  // 1. User Messages
  if (message.role === "user") {
    return (
      <div className="flex justify-end mb-4 animate-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[80%] sm:max-w-lg lg:max-w-xl">
          <div className="px-4 py-2 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 text-white shadow-lg">
            <div className="text-[15px] leading-relaxed whitespace-pre-wrap break-words font-medium">
              {message.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Assistant Messages
  if (message.role === "assistant") {
    const hasContent = message.content && message.content.trim().length > 0;
    const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;

    return (
      <div className="flex justify-start mb-4 animate-in slide-in-from-bottom-2 duration-300">
        <div className="max-w-[85%] sm:max-w-2xl lg:max-w-3xl space-y-4">
          {/* A. Render Text Content if it exists */}
          {hasContent && (
            <div className="px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm">
              <MarkdownContent
                content={message.content || ""}
                className="text-[15px] leading-relaxed text-slate-700"
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
