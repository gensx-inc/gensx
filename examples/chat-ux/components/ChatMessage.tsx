import { useState } from "react";
import { Message } from "@/hooks/useChat";
import {
  User,
  Bot,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: Message;
  messages: Message[]; // Pass all messages to find corresponding tool results
}

function JsonDisplay({ data, label }: { data: string; label: string }) {
  let formattedData;
  try {
    const parsed = JSON.parse(data);
    formattedData = JSON.stringify(parsed, null, 2);
  } catch {
    formattedData = data;
  }

  return (
    <div className="mt-2">
      <div className="text-xs font-medium text-slate-600 mb-1">{label}:</div>
      <pre className="text-xs bg-slate-100 rounded p-2 overflow-x-auto font-mono text-slate-700">
        {formattedData}
      </pre>
    </div>
  );
}

function UnifiedToolMessage({
  message,
  messages,
}: {
  message: Message;
  messages: Message[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!message.tool_calls || message.tool_calls.length === 0) {
    return null;
  }

  const toolCall = message.tool_calls[0];
  const functionName = toolCall.function.name;

  // Find the corresponding tool result message
  const toolResult = messages.find(
    (msg) => msg.role === "tool" && msg.tool_call_id === toolCall.id,
  );

  const isComplete = !!toolResult;

  return (
    <div className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 bg-white">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-slate-50 rounded-2xl transition-colors"
      >
        {isExpanded ? (
          <ChevronDown size={16} className="text-slate-600 flex-shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />
        )}
        {isComplete ? (
          <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
        ) : (
          <Loader2
            size={16}
            className="text-slate-600 flex-shrink-0 animate-spin"
          />
        )}
        <span
          className={cn(
            "text-sm font-medium",
            isComplete ? "text-green-800" : "text-slate-800",
          )}
        >
          {isComplete
            ? `Completed ${functionName} tool`
            : `Calling ${functionName} tool`}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 border-t border-slate-200">
          <JsonDisplay data={toolCall.function.arguments} label="Arguments" />
          {toolResult && toolResult.content && (
            <JsonDisplay data={toolResult.content} label="Result" />
          )}
        </div>
      )}
    </div>
  );
}

export function ChatMessage({ message, messages }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const hasToolCalls =
    message.role === "assistant" &&
    message.tool_calls &&
    message.tool_calls.length > 0;

  // Handle assistant messages with tool calls
  if (hasToolCalls) {
    return (
      <div className="flex gap-3 group animate-in slide-in-from-bottom-2 duration-300 justify-start pl-11">
        <div className="max-w-[85%] sm:max-w-md lg:max-w-lg xl:max-w-xl">
          <UnifiedToolMessage message={message} messages={messages} />
          <div className="text-xs text-slate-400 mt-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {message.timestamp.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
    );
  }

  // Skip rendering standalone tool result messages since they're now part of the unified display
  if (isTool) {
    return null;
  }

  // Regular message rendering for user and assistant messages
  const bgClass = isUser
    ? "bg-gradient-to-br from-slate-600 to-slate-700"
    : "bg-gradient-to-br from-blue-500 to-blue-600";

  const Icon = isUser ? User : Bot;

  return (
    <div
      className={cn(
        "flex gap-3 group animate-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
            bgClass,
          )}
        >
          <Icon size={16} className="text-white" />
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
              ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-500/20 shadow-blue-500/10"
              : "bg-white border-slate-200 text-slate-800 hover:shadow-md group-hover:border-slate-300",
          )}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content || "Thinking..."}
          </div>
        </div>

        <div
          className={cn(
            "text-xs text-slate-400 mt-2 px-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            isUser ? "text-right" : "text-left",
          )}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      </div>

      {isUser && (
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
            bgClass,
          )}
        >
          <Icon size={16} className="text-white" />
        </div>
      )}
    </div>
  );
}
