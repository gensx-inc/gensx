"use client";

import { useRef, useEffect, useState } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ChatHistory } from "@/components/ChatHistory";
import { useChat } from "@/hooks/useChat";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getUserId } from "@/lib/userId";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { sendMessage, messages, status, error, clear, loadHistory } =
    useChat();

  // Get thread ID from URL
  const threadId = searchParams.get("thread");

  // Initialize user ID on client side
  useEffect(() => {
    setUserId(getUserId());
  }, []);

  // Handle thread switching - clear messages and load new thread's history
  useEffect(() => {
    if (!userId) return; // Wait for userId to be initialized

    if (threadId !== currentThreadId) {
      const previousThreadId = currentThreadId;
      setCurrentThreadId(threadId);

      if (threadId) {
        // Load history if:
        // 1. We're switching FROM an existing thread (previousThreadId !== null), OR
        // 2. We're loading a thread on page refresh/initial load and have no messages
        if (previousThreadId !== null || messages.length === 0) {
          clear(); // Clear current messages first
          loadHistory(threadId, userId);
        }
      } else {
        // No thread selected, clear messages
        clear();
      }
    }
  }, [threadId, currentThreadId, userId, clear, loadHistory, messages.length]);

  // New Chat: clear messages and remove thread ID from URL
  const handleNewChat = () => {
    clear();
    router.push("?", { scroll: false });
  };

  // Send message: create thread ID if needed, update URL, then send
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !userId) return;

    let currentThreadId = threadId;
    if (!currentThreadId) {
      currentThreadId = Date.now().toString();
      router.push(`?thread=${currentThreadId}`);
    }
    await sendMessage(content.trim(), currentThreadId, userId);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Show loading state until userId is initialized */}
      {!userId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {/* Chat History Sidebar (only render if not collapsed) */}
          {!collapsed && (
            <ChatHistory
              isOpen={isHistoryOpen}
              onToggle={() => setIsHistoryOpen(!isHistoryOpen)}
              collapsed={collapsed}
              onCollapseToggle={() => setCollapsed((c) => !c)}
              activeThreadId={threadId}
              onNewChat={handleNewChat}
              userId={userId}
              isStreaming={status !== "completed"}
            />
          )}

          {/* Main Chat Area */}
          <div
            className={`flex flex-col flex-1 ${collapsed ? "" : "lg:ml-80"} transition-all duration-300 ease-in-out`}
          >
            {/* Header - Now contains New Chat button, sidebar open button if collapsed, and right-aligned links */}
            <div className="border-b border-slate-200/60 px-2 py-2 h-12 flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
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
              {/* Right-aligned links */}
              <div className="flex items-center gap-2 ml-auto mr-4">
                <Link
                  href="https://github.com/gensx-inc/gensx"
                  passHref
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src="/github-mark.svg"
                    alt="GitHub"
                    className="w-6 h-6"
                    width={24}
                    height={24}
                  />
                </Link>
                <div className="h-6 border-l border-slate-300 mx-2" />
                <Link
                  href="https://gensx.com/docs"
                  passHref
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image src="/logo.svg" alt="Docs" width={87} height={35} />
                </Link>
              </div>
            </div>

            {messages.length === 0 && !threadId ? (
              /* Empty state - Center the input in the entire remaining area */
              <div className="flex-1 flex items-center justify-center px-4">
                <div className="max-w-4xl mx-auto w-full">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={status !== "completed"}
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
                        status={
                          index === messages.length - 1 ? status : "completed"
                        }
                      />
                    ))}

                    {status === "waiting" &&
                      !messages.some((m) => m.role === "assistant") && (
                        <div className="flex justify-start px-2 py-2">
                          <div className="text-slate-500 text-sm font-medium bg-gradient-to-r from-slate-500 via-slate-600 to-slate-500 bg-clip-text text-transparent animate-pulse bg-[length:200%_100%] animate-[shimmer_2s_ease-in-out_infinite]">
                            Working on it...
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
                      disabled={status !== "completed"}
                      isCentered={false}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
