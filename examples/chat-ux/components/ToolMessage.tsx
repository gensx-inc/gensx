import { useState } from "react";
import { Message } from "@/hooks/useChat";
import { Wrench, ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { ToolCallPart, ToolResultPart } from "ai";

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
    (item): item is ToolCallPart => item.type === "tool-call",
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
      (item): item is ToolResultPart =>
        item.type === "tool-result" && item.toolCallId === toolCall.toolCallId,
    );
    if (resultItem?.output) {
      // Handle new v5 format where output can be { type: "text", value: "..." }
      if (
        typeof resultItem.output === "object" &&
        resultItem.output !== null &&
        "value" in resultItem.output
      ) {
        toolResultContent = String(resultItem.output.value);
      } else {
        toolResultContent = String(resultItem.output);
      }
    }
  }

  const isComplete = !!toolResult;

  return (
    <div className="flex justify-center">
      <div className="max-w-[85%] sm:max-w-2xl lg:max-w-3xl w-full">
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 py-2 hover:opacity-80 transition-opacity duration-200 w-full text-left"
          >
            {isComplete ? (
              <Wrench size={14} className="text-slate-400" />
            ) : (
              <Loader2 size={14} className="text-slate-400 animate-spin" />
            )}
            <span className="text-sm font-medium text-slate-500 italic">
              {isComplete ? "Called" : "Calling"} the {functionName} tool
            </span>
            {isExpanded ? (
              <ChevronDown size={14} className="text-slate-400" />
            ) : (
              <ChevronRight size={14} className="text-slate-400" />
            )}
          </button>
          {isExpanded && (
            <div className="mt-2 mb-4">
              <div className="border-l-2 border-slate-300 ml-2 pl-3 text-sm text-slate-400 whitespace-pre-wrap break-words leading-relaxed space-y-3">
                <JsonDisplay
                  data={
                    typeof toolCall.input === "string"
                      ? toolCall.input
                      : JSON.stringify(toolCall.input)
                  }
                  label="Request:"
                />
                {toolResultContent && (
                  <JsonDisplay data={toolResultContent} label="Response:" />
                )}
              </div>
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
        <div className="text-xs font-semibold text-slate-500 tracking-wide">
          {label}
        </div>
      </div>
      <div className="relative bg-slate-100 rounded-md p-2 max-h-64 overflow-auto">
        <pre className="text-xs text-slate-500 rounded-none p-0 overflow-x-auto font-mono leading-relaxed border-0 bg-transparent">
          <code>{formattedData}</code>
        </pre>
      </div>
    </div>
  );
}
