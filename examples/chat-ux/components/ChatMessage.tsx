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
  // --- Role-based Rendering ---

  // 1. User Messages
  if (message.role === "user") {
    return (
      <div className="flex gap-3 group animate-in slide-in-from-bottom-2 duration-300 justify-end">
        <div className="max-w-[85%] sm:max-w-md lg:max-w-lg xl:max-w-xl order-first">
          <div className="px-4 py-3 rounded-2xl shadow-sm border transition-all duration-200 bg-gradient-to-br from-blue-500 to-blue-600 text-white border-blue-500/20 shadow-blue-500/10">
            <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
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
        <div className="max-w-[85%] sm:max-w-md lg:max-w-lg xl:max-w-xl space-y-3">
          {/* A. Render Text Content if it exists */}
          {hasContent && (
            <div>
              <div className="px-4 py-3 rounded-2xl shadow-sm border bg-white border-slate-200 text-slate-800 hover:shadow-md group-hover:border-slate-300">
                <div className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </div>
              </div>
            </div>
          )}

          {/* B. Render Tool Calls if they exist */}
          {hasToolCalls && (
            <UnifiedToolMessage message={message} messages={messages} />
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
    // These are rendered inside UnifiedToolMessage, so we don't render them here.
    return null;
  }

  // Fallback for any other message types
  return null;
}
