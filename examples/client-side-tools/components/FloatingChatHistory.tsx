"use client";

import { useState, useEffect, useRef } from "react";
import { Message } from "@/hooks/useChat";
import { MessageCircle, X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TextPart } from "ai";

interface FloatingChatHistoryProps {
  messages: Message[];
  isVisible: boolean;
  onClose: () => void;
}

export function FloatingChatHistory({
  messages,
  isVisible,
  onClose,
}: FloatingChatHistoryProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current && isVisible && isExpanded) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isVisible, isExpanded]);

  if (!isVisible) return null;

  const renderMessageContent = (message: Message) => {
    if (message.role === "user") {
      return (
        <div className="text-sm text-slate-900 leading-relaxed font-medium">
          {typeof message.content === "string"
            ? message.content
            : message.content
                ?.filter((part): part is TextPart => part.type === "text")
                .map((part) => part.text)
                .join(" ") || ""}
        </div>
      );
    }

    if (message.role === "assistant") {
      // Handle assistant messages - only show text content, skip tool calls
      const content = message.content;

      if (typeof content === "string") {
        return (
          <div className="text-sm text-slate-700 leading-relaxed">
            {content}
          </div>
        );
      }

      // Extract only text parts, skip tool calls
      const textParts =
        content?.filter((part): part is TextPart => part.type === "text") || [];

      if (textParts.length === 0) {
        // If there are no text parts, don't render anything (message will be filtered out)
        return null;
      }

      return (
        <div className="space-y-2">
          {textParts.map((part, index) => (
            <div key={index} className="text-sm text-slate-700 leading-relaxed">
              {part.text}
            </div>
          ))}
        </div>
      );
    }

    // Filter out system and tool messages completely - they should not appear in chat history
    // Tool calls are handled by toasts only
    return null;
  };

  // Filter out messages that return null content (assistant messages with only tool calls)
  const visibleMessages = messages.filter((message) => {
    const content = renderMessageContent(message);
    return content !== null;
  });

  return (
    <div className="fixed top-6 right-6 z-[9995] w-80 max-h-[calc(100vh-12rem)] flex flex-col">
      {/* Glass morphism container */}
      <div className="relative rounded-3xl overflow-hidden shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)] transition-all duration-400 ease-out backdrop-blur-[6px] bg-white/25 border border-white/40">
        <div className="absolute inset-0 z-[1] overflow-hidden rounded-3xl shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />

        {/* Header */}
        <div className="relative z-[2] p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Chat History
                </div>
                <div className="text-xs text-slate-600">
                  {visibleMessages.length} messages
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors duration-200"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-700" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-700" />
                )}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-white/20 transition-colors duration-200"
              >
                <X className="w-4 h-4 text-slate-700" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        {isExpanded && (
          <div className="relative z-[2] max-h-96 overflow-y-auto">
            {visibleMessages.length === 0 ? (
              <div className="p-6 text-center">
                <div className="text-sm text-slate-600">
                  No messages yet. Start a conversation!
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {visibleMessages.map((message, index) => (
                  <div key={index} className="space-y-2">
                    <div
                      className={cn(
                        "rounded-2xl p-3 max-w-[90%] shadow-sm",
                        message.role === "user"
                          ? "bg-blue-500/20 border border-blue-300/30 ml-auto"
                          : message.role === "system"
                            ? "bg-slate-400/20 border border-slate-300/30"
                            : message.role === "tool"
                              ? "bg-blue-400/20 border border-blue-300/30"
                              : "bg-slate-100/60 border border-slate-200/40",
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          {renderMessageContent(message)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
