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

  // Extract tool calls from the message content
  if (!Array.isArray(message.content)) {
    return null;
  }

  const toolCalls = message.content.filter(
    (
      item,
    ): item is {
      type: "tool-call";
      toolCallId: string;
      toolName: string;
      args: unknown;
    } => item.type === "tool-call",
  );

  if (toolCalls.length === 0) {
    return null;
  }

  const toolCall = toolCalls[0];
  const functionName = toolCall.toolName;

  // Find the corresponding tool result message
  const toolResult = messages.find((msg) => {
    if (msg.role !== "tool" || !Array.isArray(msg.content)) return false;

    return msg.content.some(
      (item) =>
        item.type === "tool-result" && item.toolCallId === toolCall.toolCallId,
    );
  });

  // Extract the actual result content from the tool message
  let toolResultContent: string | null = null;
  if (toolResult && Array.isArray(toolResult.content)) {
    const resultItem = toolResult.content.find(
      (
        item,
      ): item is {
        type: "tool-result";
        toolCallId: string;
        toolName: string;
        result: string;
      } =>
        item.type === "tool-result" && item.toolCallId === toolCall.toolCallId,
    );
    toolResultContent = resultItem?.result || null;
  }

  const isComplete = !!toolResult;

  return (
    <div className="flex justify-center">
      <div className="max-w-[85%] sm:max-w-2xl lg:max-w-3xl w-full">
        <div
          className={cn(
            "border rounded-lg transition-all duration-200",
            isExpanded
              ? "border-slate-200 bg-slate-50/50"
              : "border-transparent",
          )}
        >
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "w-full flex items-center gap-3 py-2 px-3 hover:bg-slate-100/50 transition-colors duration-200",
              isExpanded
                ? "rounded-t-lg border-b border-slate-200"
                : "rounded-lg",
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-slate-100",
                )}
              >
                {isComplete ? (
                  <CheckCircle size={12} className="text-slate-600" />
                ) : (
                  <Loader2 size={12} className="text-slate-600 animate-spin" />
                )}
              </div>
              <span className="text-sm font-medium text-slate-700">
                {isComplete ? "Called" : "Calling"} the {functionName} tool
              </span>
            </div>

            {isExpanded ? (
              <ChevronDown size={14} className="text-slate-400 ml-auto" />
            ) : (
              <ChevronRight size={14} className="text-slate-400 ml-auto" />
            )}
          </button>

          {isExpanded && (
            <div className="p-3 space-y-3 bg-slate-50/30">
              <JsonDisplay
                data={
                  typeof toolCall.args === "string"
                    ? toolCall.args
                    : JSON.stringify(toolCall.args)
                }
                label="Arguments"
              />
              {toolResultContent && (
                <JsonDisplay data={toolResultContent} label="Result" />
              )}
            </div>
          )}
        </div>
      </div>
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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
          {label}
        </div>
      </div>
      <div className="relative">
        <pre
          className="text-xs text-slate-300 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed border"
          style={{ backgroundColor: "#282c34" }}
        >
          <code>{formattedData}</code>
        </pre>
      </div>
    </div>
  );
}
