import { useState } from "react";
import { Message } from "@/hooks/useChat";
import { CheckCircle, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToolMessageProps {
  message: Message;
  messages: Message[];
}

export function ToolMessage({ message, messages }: ToolMessageProps) {
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

interface JsonDisplayProps {
  data: string;
  label: string;
}

export function JsonDisplay({ data, label }: JsonDisplayProps) {
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
