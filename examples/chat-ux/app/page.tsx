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
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const { sendMessage, messages, isLoading, error, clear, loadHistory } =
    useChat();

  // Get thread ID from URL
  const threadId = searchParams.get("thread");

  // Handle thread switching - clear messages and load new thread's history
  useEffect(() => {
    if (threadId !== currentThreadId) {
      // Thread has changed
      setCurrentThreadId(threadId);

      if (threadId) {
        // Load the new thread's history
        clear(); // Clear current messages first
        loadHistory(threadId);
      } else {
        // No thread selected, clear messages
        clear();
      }
    }
  }, [threadId, currentThreadId, clear, loadHistory]);

  // New Chat: clear messages and remove thread ID from URL
  const handleNewChat = () => {
    clear();
    router.push("?", { scroll: false });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Send message: create thread ID if needed, update URL, then send
  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;

    let currentThreadId = threadId;
    if (!currentThreadId) {
      currentThreadId = Date.now().toString();
      router.push(`?thread=${currentThreadId}`);
    }
    await sendMessage(content.trim(), currentThreadId);
  };

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
        className={`flex flex-col flex-1 ${collapsed ? "" : "lg:ml-80"} transition-all duration-300 ease-in-out`}
      >
        {/* Header - Now contains New Chat button and sidebar open button if collapsed */}
        <div className="border-b border-slate-200/60 px-2 py-2 flex items-center gap-2">
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
            <Plus className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {messages.length === 0 && !threadId ? (
          /* Empty state - Center the input in the entire remaining area */
          <div className="flex-1 flex items-center justify-center px-4">
            <div className="max-w-4xl mx-auto w-full">
              <ChatInput
                onSendMessage={handleSendMessage}
                disabled={isLoading}
                isCentered={true}
              />
            </div>
          </div>
        ) : (
          /* Messages exist - Use normal layout with messages and bottom input */
          <>
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-4xl mx-auto space-y-0">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={`${threadId || "new"}-${index}`}
                    message={message}
                    messages={messages}
                  />
                ))}

                {isLoading && (
                  <div className="flex justify-start px-4 py-3">
                    <div className="text-slate-500 text-md font-medium bg-gradient-to-r from-slate-500 via-slate-600 to-slate-500 bg-clip-text text-transparent animate-pulse bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]">
                      Thinking...
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
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={isLoading}
                  isCentered={false}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
