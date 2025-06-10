import { useState } from "react";
import { Message } from "@/app/hooks/useChat";
import {
  User,
  Bot,
  CheckCircle,
  XCircle,
  Settings,
  ChevronRight,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/app/lib/utils";

interface ChatMessageProps {
  message: Message;
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

function ToolCallMessage({
  message,
  isComplete = false,
}: {
  message: Message;
  isComplete?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  const functionName = message.function_name || "unknown";

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
        {!isComplete ? (
          <Loader2
            size={16}
            className="text-slate-600 flex-shrink-0 animate-spin"
          />
        ) : (
          <Settings size={16} className="text-slate-600 flex-shrink-0" />
        )}
        <span className="text-sm font-medium text-slate-800">
          {!isComplete
            ? `Calling the ${functionName} tool`
            : `Called ${functionName} tool`}
        </span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 border-t border-slate-200">
          {message.arguments && (
            <JsonDisplay data={message.arguments} label="Arguments" />
          )}
          {isComplete && message.result && (
            <JsonDisplay data={message.result} label="Response" />
          )}
        </div>
      )}
    </div>
  );
}

function ToolResultMessage({ message }: { message: Message }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const functionName = message.function_name || "unknown";
  const isError = message.isError;

  const bgColor = isError ? "bg-red-50" : "bg-green-50";
  const borderColor = isError ? "border-red-200" : "border-green-200";
  const hoverColor = isError ? "hover:bg-red-100/50" : "hover:bg-green-100/50";
  const textColor = isError ? "text-red-800" : "text-green-800";
  const iconColor = isError ? "text-red-600" : "text-green-600";
  const Icon = isError ? XCircle : CheckCircle;

  return (
    <div
      className={cn(
        "border rounded-2xl shadow-sm hover:shadow-md transition-all duration-200",
        bgColor,
        borderColor,
      )}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "w-full px-4 py-3 text-left flex items-center gap-2 rounded-2xl transition-colors",
          hoverColor,
        )}
      >
        {isExpanded ? (
          <ChevronDown size={16} className={cn("flex-shrink-0", iconColor)} />
        ) : (
          <ChevronRight size={16} className={cn("flex-shrink-0", iconColor)} />
        )}
        <Icon size={16} className={cn("flex-shrink-0", iconColor)} />
        <span className={cn("text-sm font-medium", textColor)}>
          {isError
            ? `Error from ${functionName} tool`
            : `Result from ${functionName} tool`}
        </span>
      </button>

      {isExpanded && (
        <div
          className={cn(
            "px-4 pb-3 border-t border-opacity-50",
            isError ? "border-red-200" : "border-green-200",
          )}
        >
          {message.result && (
            <JsonDisplay data={message.result} label="Response" />
          )}
        </div>
      )}
    </div>
  );
}

function ToolCompleteMessage({ message }: { message: Message }) {
  return <ToolCallMessage message={message} isComplete={true} />;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isTool = message.role === "tool";
  const isToolCall = message.messageType === "tool_call";
  const isToolComplete = message.messageType === "tool_complete";

  // Handle completed tool calls (call + result combined)
  if (isToolComplete) {
    return (
      <div className="flex gap-3 group animate-in slide-in-from-bottom-2 duration-300 justify-start pl-11">
        <div className="max-w-[85%] sm:max-w-md lg:max-w-lg xl:max-w-xl">
          <ToolCompleteMessage message={message} />
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

  // Handle tool calls (before result is received)
  if (isToolCall) {
    return (
      <div className="flex gap-3 group animate-in slide-in-from-bottom-2 duration-300 justify-start pl-11">
        <div className="max-w-[85%] sm:max-w-md lg:max-w-lg xl:max-w-xl">
          <ToolCallMessage message={message} />
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

  if (isTool) {
    const Icon = message.isError ? XCircle : CheckCircle;
    const bgClass = message.isError
      ? "bg-gradient-to-br from-red-500 to-red-600"
      : "bg-gradient-to-br from-green-500 to-green-600";

    return (
      <div className="flex gap-3 group animate-in slide-in-from-bottom-2 duration-300 justify-start">
        <div
          className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm",
            bgClass,
          )}
        >
          <Icon size={16} className="text-white" />
        </div>
        <div className="max-w-[85%] sm:max-w-md lg:max-w-lg xl:max-w-xl">
          <ToolResultMessage message={message} />
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
            {message.content}
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
