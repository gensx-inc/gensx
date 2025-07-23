import { useState, useEffect, useRef } from "react";
import { Message } from "@/hooks/useChat";
import { RouteData } from "@/hooks/useMapTools";
import {
  MessageCircle,
  X,
  ChevronUp,
  ChevronDown,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TextPart } from "ai";
import { MarkdownContent } from "./MarkdownContent";

interface CombinedFloatingPanelProps {
  messages: Message[];
  route: RouteData | null;
  isVisible: boolean;
  onClose: () => void;
}

type PanelTab = "chat" | "directions";

export function CombinedFloatingPanel({
  messages,
  route,
  isVisible,
  onClose,
}: CombinedFloatingPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<PanelTab>("chat");
  const desktopMessagesEndRef = useRef<HTMLDivElement>(null);
  const mobileMessagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (
      desktopMessagesEndRef.current &&
      isVisible &&
      isExpanded &&
      activeTab === "chat"
    ) {
      desktopMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    if (
      mobileMessagesEndRef.current &&
      isVisible &&
      isExpanded &&
      activeTab === "chat"
    ) {
      mobileMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isVisible, isExpanded, activeTab]);

  if (!isVisible) return null;

  const formatTransportMode = (profile: string) => {
    switch (profile) {
      case "driving":
        return "🚗 Driving";
      case "walking":
        return "🚶 Walking";
      case "cycling":
        return "🚴 Cycling";
      default:
        return profile.replace("-", " ");
    }
  };

  const getInstructionIcon = (type: number) => {
    // Basic instruction type mapping for OpenRouteService
    switch (type) {
      case 0:
      case 1:
        return "⬆️"; // Continue/straight
      case 2:
        return "↗️"; // Turn slight right
      case 3:
        return "➡️"; // Turn right
      case 4:
        return "↘️"; // Turn sharp right
      case 5:
        return "⬇️"; // U-turn
      case 6:
        return "↙️"; // Turn sharp left
      case 7:
        return "⬅️"; // Turn left
      case 8:
        return "↖️"; // Turn slight left
      default:
        return "📍"; // Default
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    } else {
      return `${(meters / 1000).toFixed(1)} km`;
    }
  };

  const renderMessageContent = (message: Message) => {
    if (message.role === "user") {
      return (
        <div className="text-sm text-slate-900 leading-relaxed font-medium">
          <MarkdownContent
            content={
              typeof message.content === "string"
                ? message.content
                : message.content
                    ?.filter((part): part is TextPart => part.type === "text")
                    .map((part) => part.text)
                    .join(" ") || ""
            }
          />
        </div>
      );
    }

    if (message.role === "assistant") {
      // Handle assistant messages - only show text content, skip tool calls
      const content = message.content;

      if (typeof content === "string") {
        return (
          <div className="text-sm text-slate-700 leading-relaxed">
            <MarkdownContent content={content} />
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
              <MarkdownContent content={part.text} />
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

  const renderChatTab = () => (
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
                  <div className="flex-1">{renderMessageContent(message)}</div>
                </div>
              </div>
            </div>
          ))}
          <div ref={desktopMessagesEndRef} />
        </div>
      )}
    </div>
  );

  const renderDirectionsTab = () => {
    if (!route) {
      return (
        <div className="relative z-[2] p-6 text-center">
          <div className="text-sm text-slate-600">
            No route available. Get directions first!
          </div>
        </div>
      );
    }

    return (
      <div className="relative z-[2] max-h-96 overflow-y-auto">
        {/* Route Summary */}
        <div className="p-4 border-b border-white/20 bg-white/10">
          <div className="flex justify-between items-center">
            <div className="text-lg font-bold text-slate-900">
              {route.distanceText}
            </div>
            <div className="text-lg font-bold text-blue-600">
              {route.durationText}
            </div>
          </div>
        </div>

        {/* Directions List */}
        <div className="overflow-y-auto">
          {route.directions.map((direction, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 border-b border-white/10 last:border-b-0 hover:bg-white/10"
            >
              <div className="text-lg mt-1 flex-shrink-0">
                {getInstructionIcon(direction.type || 0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-900 leading-relaxed">
                  {direction.instruction}
                </p>
                {direction.name && (
                  <p className="text-xs text-slate-600 mt-1">
                    on {direction.name}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">
                    {formatDistance(direction.distance)}
                  </span>
                  {direction.duration > 0 && (
                    <span className="text-xs text-slate-500">
                      • {Math.round(direction.duration / 60)}min
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Layout */}
      <div className="hidden md:block fixed top-6 right-6 z-[9995] w-80 max-h-[calc(100vh-12rem)]">
        {/* Glass morphism container */}
        <div className="relative rounded-3xl overflow-hidden shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)] transition-all duration-400 ease-out backdrop-blur-[6px] bg-white/25 border border-white/40">
          <div className="absolute inset-0 z-[1] overflow-hidden rounded-3xl shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />

          {/* Header */}
          <div className="relative z-[2] p-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  {activeTab === "chat" ? (
                    <MessageCircle className="w-4 h-4 text-white" />
                  ) : (
                    <Navigation className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {activeTab === "chat" ? "Chat History" : "Directions"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {activeTab === "chat"
                      ? `${visibleMessages.length} messages`
                      : route
                        ? formatTransportMode(route.profile)
                        : "No route"}
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

          {/* Tab Navigation */}
          {!!route && (
            <div className="relative z-[2] flex border-b border-white/20">
              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200",
                  activeTab === "chat"
                    ? "text-blue-600 bg-white/20 border-b-2 border-blue-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/10",
                )}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab("directions")}
                className={cn(
                  "flex-1 px-4 py-2 text-sm font-medium transition-colors duration-200",
                  activeTab === "directions"
                    ? "text-blue-600 bg-white/20 border-b-2 border-blue-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/10",
                )}
              >
                Directions
              </button>
            </div>
          )}

          {/* Content */}
          {isExpanded && (
            <>
              {activeTab === "chat" && renderChatTab()}
              {activeTab === "directions" && renderDirectionsTab()}
            </>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden fixed inset-x-0 top-[60px] bottom-[100px] z-[9995] mx-4">
        {/* Mobile container with glass morphism */}
        <div className="relative rounded-2xl shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)] transition-all duration-400 ease-out backdrop-blur-[6px] bg-white/25 border border-white/40 h-full flex flex-col">
          {/* Glass morphism effects */}
          <div className="absolute inset-0 z-[1] rounded-2xl shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)] pointer-events-none" />
          {/* Header */}
          <div className="relative z-[2] p-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  {activeTab === "chat" ? (
                    <MessageCircle className="w-4 h-4 text-white" />
                  ) : (
                    <Navigation className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    {activeTab === "chat" ? "Chat History" : "Directions"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {activeTab === "chat"
                      ? `${visibleMessages.length} messages`
                      : route
                        ? formatTransportMode(route.profile)
                        : "No route"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Only show chevron on desktop */}
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="hidden md:flex p-2.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 transition-all duration-200 min-h-[44px] min-w-[44px]"
                >
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-slate-700" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-700" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 active:scale-95 transition-all duration-200 min-h-[44px] min-w-[44px]"
                >
                  <X className="w-5 h-5 text-slate-700" />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          {!!route && (
            <div className="relative z-[2] flex border-b border-white/20">
              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 min-h-[48px]",
                  activeTab === "chat"
                    ? "text-blue-600 bg-white/20 border-b-2 border-blue-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/10",
                )}
              >
                Chat
              </button>
              <button
                onClick={() => setActiveTab("directions")}
                className={cn(
                  "flex-1 px-4 py-3 text-sm font-medium transition-colors duration-200 min-h-[48px]",
                  activeTab === "directions"
                    ? "text-blue-600 bg-white/20 border-b-2 border-blue-600"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/10",
                )}
              >
                Directions
              </button>
            </div>
          )}

          {/* Content - Mobile always shows, no expand/collapse */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "chat" && (
              <div
                className="h-full overflow-y-scroll touch-pan-y"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
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
                    <div ref={mobileMessagesEndRef} />
                  </div>
                )}
              </div>
            )}
            {activeTab === "directions" && (
              <div className="h-full flex flex-col">
                {!route ? (
                  <div className="p-6 text-center">
                    <div className="text-sm text-slate-600">
                      No route available. Get directions first!
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Route Summary */}
                    <div className="flex-shrink-0 p-4 border-b border-white/10 bg-white/10">
                      <div className="flex justify-between items-center">
                        <div className="text-lg font-bold text-slate-900">
                          {route.distanceText}
                        </div>
                        <div className="text-lg font-bold text-blue-600">
                          {route.durationText}
                        </div>
                      </div>
                    </div>

                    {/* Directions List - Scrollable */}
                    <div
                      className="flex-1 overflow-y-scroll touch-pan-y"
                      style={{ WebkitOverflowScrolling: "touch" }}
                    >
                      {route.directions.map((direction, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-4 border-b border-white/10 last:border-b-0 hover:bg-white/10"
                        >
                          <div className="text-lg mt-1 flex-shrink-0">
                            {getInstructionIcon(direction.type || 0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-900 leading-relaxed">
                              {direction.instruction}
                            </p>
                            {direction.name && (
                              <p className="text-xs text-slate-600 mt-1">
                                on {direction.name}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-slate-500">
                                {formatDistance(direction.distance)}
                              </span>
                              {direction.duration > 0 && (
                                <span className="text-xs text-slate-500">
                                  • {Math.round(direction.duration / 60)}min
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
