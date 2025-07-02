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
import { ResearchBrief } from "@/components/ResearchBrief";

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
    researchBrief,
    prompt,
    status,
    error,
    loadResearch,
    clear,
  } = useDeepResearch();
  const [queriesExpanded, setQueriesExpanded] = useState(true);
  const [resultsExpanded, setResultsExpanded] = useState(true);
  const [researchBriefExpanded, setResearchBriefExpanded] = useState(true);

  // Get thread ID from URL
  const threadId = searchParams.get("thread");

  // Initialize user ID on client side
  useEffect(() => {
    setUserId(getUserId());
  }, []);

  // Auto-collapse sections when report starts streaming
  // useEffect(() => {
  //   if (report && report.length > 0) {
  //     setQueriesExpanded(false);
  //     setResultsExpanded(false);
  //     setResearchBriefExpanded(false);
  //   }
  // }, [report]);

  // Handle thread switching - load research data when thread changes
  useEffect(() => {
    if (!userId) return; // Wait for userId to be initialized

    if (threadId !== currentThreadId) {
      const previousThreadId = currentThreadId;
      setCurrentThreadId(threadId);

      if (threadId) {
        // Load research if:
        // 1. We're switching FROM an existing thread (previousThreadId !== null), OR
        // 2. We're loading a thread on page refresh/initial load and have no data
        if (previousThreadId !== null || (!prompt && !queries && !report)) {
          clear(); // Clear current data first
          loadResearch(threadId, userId);
        }
      } else {
        // No thread selected, clear data
        clear();
        setQueriesExpanded(true);
        setResultsExpanded(true);
      }
    }
  }, [
    threadId,
    currentThreadId,
    userId,
    clear,
    loadResearch,
    prompt,
    queries,
    report,
  ]);

  // New Chat: remove thread ID from URL and reset state
  const handleNewChat = () => {
    setQueriesExpanded(true);
    setResultsExpanded(true);
    setResearchBriefExpanded(true);
    clear();
    router.push("?", { scroll: false });
  };

  // Send message: use runWorkflow for new research
  const handleSendMessage = async (content: string) => {
    if (!content.trim() || !userId) return;

    setQueriesExpanded(true);
    setResultsExpanded(true);
    setResearchBriefExpanded(true);

    let currentThreadId = threadId;
    if (!currentThreadId) {
      currentThreadId = Date.now().toString();
      router.push(`?thread=${currentThreadId}`);
    }

    await runWorkflow(content.trim(), userId, currentThreadId);
  };

  return (
    <div className="flex h-screen bg-zinc-950">
      {/* Show loading state until userId is initialized */}
      {!userId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-zinc-400">Loading...</div>
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
            <div className="border-b border-zinc-800 px-2 py-2 h-12 flex items-center gap-2 justify-between bg-zinc-900">
              <div className="flex items-center gap-2">
                {collapsed && (
                  <button
                    onClick={() => setCollapsed(false)}
                    className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded-md transition-colors mr-2"
                    title="Open sidebar"
                  >
                    <PanelLeftOpen className="w-5 h-5 text-zinc-400" />
                  </button>
                )}
                <button
                  onClick={handleNewChat}
                  className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded-md transition-colors"
                  title="New chat"
                >
                  <Plus className="w-5 h-5 text-zinc-400" />
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
                    className="w-6 h-6 opacity-70 hover:opacity-100 transition-opacity"
                    width={24}
                    height={24}
                  />
                </Link>
                <div className="h-6 border-l border-zinc-600 mx-2" />
                <Link
                  href="https://gensx.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src="/logo.svg"
                    alt="Docs"
                    width={87}
                    height={35}
                    className="opacity-70 hover:opacity-100 transition-opacity"
                  />
                </Link>
              </div>
            </div>

            {!prompt && !threadId ? (
              /* Empty state */
              <div className="flex-1 flex items-center justify-center px-4 bg-zinc-900">
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
                <div className="flex-1 overflow-y-auto px-4 py-6 bg-zinc-900">
                  <div className="max-w-5xl mx-auto w-full">
                    {/* Research Prompt */}
                    <ResearchPrompt prompt={prompt} />

                    {/* Research Brief */}
                    <ResearchBrief
                      researchBrief={researchBrief || ""}
                      expanded={researchBriefExpanded}
                      onToggle={() =>
                        setResearchBriefExpanded(!researchBriefExpanded)
                      }
                      isActive={status === "Planning"}
                    />

                    {/* Research Queries */}
                    <ResearchQueries
                      queries={queries || []}
                      expanded={queriesExpanded}
                      onToggle={() => setQueriesExpanded(!queriesExpanded)}
                      isActive={status === "Searching"}
                    />

                    {/* Search Results */}
                    <SearchResults
                      searchResults={searchResults || []}
                      expanded={resultsExpanded}
                      onToggle={() => setResultsExpanded(!resultsExpanded)}
                      isActive={status === "Reading"}
                    />

                    {/* Research Report */}
                    <ResearchReport
                      report={report || ""}
                      isActive={status === "Generating"}
                    />

                    {error && (
                      <div className="flex justify-start px-2 py-2">
                        <div className="bg-red-900/50 border border-red-800 rounded-lg px-4 py-3 max-w-xs">
                          <p className="text-red-300 text-sm">{error}</p>
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
