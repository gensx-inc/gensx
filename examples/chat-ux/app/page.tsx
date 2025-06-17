"use client";

import { useRef, useEffect, useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ChatHistory } from "@/components/ChatHistory";
import { useChat } from "@/hooks/useChat";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, PanelLeftOpen } from "lucide-react";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const { sendMessage, messages, isLoading, error, clear, loadHistory } =
    useChat();

  const threadId = searchParams.get("thread");

  // Get or create thread ID
  const getThreadId = () => {
    if (threadId) return threadId;

    // Generate new thread ID and update URL
    const newThreadId = Date.now().toString();
    router.push(`?thread=${newThreadId}`);
    return newThreadId;
  };

  // Load chat history when thread ID changes
  useEffect(() => {
    if (threadId) {
      loadHistory(threadId);
    } else {
      clear(); // Clear messages if no thread ID
    }
  }, [searchParams, loadHistory, clear, threadId]);

  const handleNewChat = () => {
    const newThreadId = Date.now().toString();
    router.push(`?thread=${newThreadId}`);
    clear();
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    await sendMessage(content.trim(), getThreadId());
  };

  // Sidebar width: Expanded: 320px (w-80), Collapsed: 80px (w-20)
  const sidebarWidth = collapsed ? "lg:ml-20" : "lg:ml-80";

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Chat History Sidebar (only render if not collapsed) */}
      {!collapsed && (
        <ChatHistory
          isOpen={isHistoryOpen}
          onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
          collapsed={collapsed}
          onCollapseToggle={() => setCollapsed((c) => !c)}
          activeThreadId={threadId}
          onNewChat={handleNewChat}
        />
      )}

      {/* Main Chat Area */}
      <div
        className={`flex flex-col flex-1 ${collapsed ? "" : sidebarWidth} transition-all duration-300 ease-in-out`}
      >
        {/* Header - Now contains New Chat button and sidebar open button if collapsed */}
        <div className="border-b border-slate-200/60 px-4 py-4 flex items-center gap-2">
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-md transition-colors mr-2"
              title="Open sidebar"
            >
              <PanelLeftOpen className="w-5 h-5 text-slate-600" />
            </button>
          )}
          <button
            onClick={handleNewChat}
            className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-md transition-colors"
            title="New chat"
          >
            <Plus className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Messages Container */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6"
        >
          <div className="max-w-4xl mx-auto space-y-0">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-slate-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No messages yet
                </h3>
                <p className="text-slate-500 max-w-sm">
                  Start a conversation by sending a message below.
                </p>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    messages={messages}
                  />
                ))}
              </>
            )}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm max-w-xs">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 shadow-sm max-w-xs">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="px-4 pb-4">
          <div className="max-w-4xl mx-auto">
            <ChatInput onSendMessage={handleSendMessage} disabled={isLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
