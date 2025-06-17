import { Message } from "@/hooks/useChat";
import { User, Bot } from "lucide-react";
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
      <div className="flex gap-3 group animate-in slide-in-from-bottom-2 duration-300 justify-end">
        <div className="max-w-[85%] sm:max-w-md lg:max-w-lg xl:max-w-xl order-first">
          <div className="px-4 py-3 rounded-2xl shadow-sm border transition-all duration-200 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-500/20 shadow-blue-500/10">
            <div className="text-base leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-right">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-br from-slate-600 to-slate-700">
          <User size={16} className="text-white" />
        </div>
      </div>
    );
  }

  // 2. Assistant Messages
  if (message.role === "assistant") {
    const hasContent = message.content && message.content.trim().length > 0;
    const hasToolCalls = message.tool_calls && message.tool_calls.length > 0;

    return (
      <div className="flex gap-3 group animate-in slide-in-from-bottom-2 duration-300 justify-start">
        {/* Assistant Icon */}
        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm bg-gradient-to-br from-blue-500 to-blue-600">
          <Bot size={16} className="text-white" />
        </div>

        {/* Message Content */}
        <div className="max-w-[95%] sm:max-w-xl lg:max-w-2xl xl:max-w-3xl space-y-3">
          {/* A. Render Text Content if it exists */}
          {hasContent && (
            <MarkdownContent
              content={message.content || ""}
              className="text-base leading-relaxed text-slate-800"
            />
          )}

          {/* B. Render Tool Calls if they exist */}
          {hasToolCalls && (
            <ToolMessage message={message} messages={messages} />
          )}

          {/* Timestamp */}
          <div className="text-xs text-slate-400 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
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
