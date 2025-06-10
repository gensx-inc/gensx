import { User, Bot } from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatMessageProps {
  message: ChatMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-3 group animate-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
          <Bot size={16} className="text-white" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[85%] sm:max-w-md lg:max-w-lg xl:max-w-xl",
          isUser ? "order-first" : "",
        )}
      >
        <div
          className={cn(
            "px-4 py-3 rounded-2xl shadow-sm border transition-all duration-200",
            isUser
              ? "bg-gradient-to-b r from-blue-500 to-blue-600 text-white border-blue-500/20 shadow-blue-500/10"
              : "bg-white border-slate-200 text-slate-800 hover:shadow-md group-hover:border-slate-300",
          )}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>
        </div>

        <div
          className={cn(
            "text-xs text-slate-400 mt-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            isUser ? "text-right" : "text-left",
          )}
        >
          {/* {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })} */}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center shadow-sm">
          <User size={16} className="text-white" />
        </div>
      )}
    </div>
  );
}
