"use client";

import { useEffect, useState } from "react";
import { ChatHistory } from "@/components/ChatHistory";
import { ResearchQueries } from "@/components/ResearchQueries";
import { SearchResults } from "@/components/SearchResults";
import { ResearchReport } from "@/components/ResearchReport";
import { useDeepResearch } from "@/hooks/useDeepResearch";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getUserId } from "@/lib/userId";
import { ResearchPrompt } from "@/components/ResearchPrompt";
import { ChatInput } from "@/components/ChatInput";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const {
    runWorkflow,
    queries,
    searchResults,
    report,
    prompt,
    status,
    error,
    loadResearch,
    clear,
  } = useDeepResearch();
  const [queriesExpanded, setQueriesExpanded] = useState(true);
  const [resultsExpanded, setResultsExpanded] = useState(true);

  // Get thread ID from URL
  const threadId = searchParams.get("thread");

  // Initialize user ID on client side
  useEffect(() => {
    setUserId(getUserId());
  }, []);

  // Auto-collapse sections when report starts streaming
  useEffect(() => {
    if (report && report.length > 0) {
      setQueriesExpanded(false);
      setResultsExpanded(false);
    }
  }, [report]);

  // Handle thread switching - load research data when thread changes
  useEffect(() => {
    if (!userId) return; // Wait for userId to be initialized

    if (threadId !== currentThreadId) {
      setCurrentThreadId(threadId);

      if (threadId) {
        // Always load research data when switching to a thread
        clear(); // Clear current data first
        loadResearch(threadId, userId);
      } else {
        // No thread selected, clear data
        clear();
        setQueriesExpanded(true);
        setResultsExpanded(true);
      }
    }
  }, [threadId, currentThreadId, userId, clear, loadResearch]);

  // New Chat: remove thread ID from URL and reset state
  const handleNewChat = () => {
    setQueriesExpanded(true);
    setResultsExpanded(true);
    clear();
    router.push("?", { scroll: false });
  };

  // Send message: use runWorkflow for new research
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !userId) return;

    setQueriesExpanded(true);
    setResultsExpanded(true);

    let currentThreadId = threadId;
    if (!currentThreadId) {
      currentThreadId = Date.now().toString();
      router.push(`?thread=${currentThreadId}`);
    }

    await runWorkflow(content.trim(), userId, currentThreadId);
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
              isStreaming={status !== "Completed"}
            />
          )}

          {/* Main Chat Area */}
          <div
            className={`flex flex-col flex-1 ${collapsed ? "" : "lg:ml-80"} transition-all duration-300 ease-in-out`}
          >
            {/* Header */}
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
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image src="/logo.svg" alt="Docs" width={87} height={35} />
                </Link>
              </div>
            </div>

            {!prompt && !threadId ? (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center px-4">
                <div className="max-w-4xl mx-auto w-full">
                  <ChatInput
                    onSendMessage={handleSendMessage}
                    disabled={
                      status === "Planning" ||
                      status === "Searching" ||
                      status === "Generating"
                    }
                    isCentered={true}
                  />
                </div>
              </div>
            ) : (
              <>
                {/* Main Research Content Container */}
                <div className="flex-1 overflow-y-auto px-4 py-6">
                  <div className="max-w-4xl mx-auto w-full">
                    {/* Research Prompt */}
                    <ResearchPrompt prompt={prompt} />

                    {/* Show research progress */}
                    {status && status !== "Completed" && (
                      <div className="flex justify-start px-2 py-2">
                        <div className="text-slate-500 text-sm font-medium">
                          Status: {status}
                        </div>
                      </div>
                    )}

                    {/* Research Queries */}
                    <ResearchQueries
                      queries={queries || []}
                      expanded={queriesExpanded}
                      onToggle={() => setQueriesExpanded(!queriesExpanded)}
                    />

                    {/* Search Results */}
                    <SearchResults
                      searchResults={searchResults || []}
                      expanded={resultsExpanded}
                      onToggle={() => setResultsExpanded(!resultsExpanded)}
                    />

                    {/* Research Report */}
                    <ResearchReport report={report || ""} status={status} />

                    {error && (
                      <div className="flex justify-start">
                        <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3 shadow-sm max-w-xs">
                          <p className="text-red-600 text-sm">{error}</p>
                        </div>
                      </div>
                    )}
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
