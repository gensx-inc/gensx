import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PanelLeftClose, Trash } from "lucide-react";
import {
  getThreadSummaries,
  deleteChatHistory,
} from "@/lib/actions/chat-history";

interface ChatHistoryProps {
  isOpen: boolean;
  onToggle: () => void;
  collapsed: boolean;
  onCollapseToggle: () => void;
  activeThreadId: string | null;
  onNewChat: () => void;
  userId: string;
  isStreaming: boolean;
}

interface Thread {
  id: string;
  title: string;
  lastMessage: string;
}

export function ChatHistory({
  isOpen,
  onToggle,
  activeThreadId,
  onNewChat,
  userId,
  isStreaming,
}: ChatHistoryProps) {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevIsStreaming = useRef(isStreaming);

  const fetchHistory = useCallback(
    async (setLoading = true) => {
      try {
        if (setLoading) {
          setIsLoading(true);
        }
        const data = await getThreadSummaries(userId);
        setThreads(data || []);
      } catch (error) {
        console.error("Error fetching chat history:", error);
        setThreads([]);
      } finally {
        if (setLoading) {
          setIsLoading(false);
        }
      }
    },
    [userId],
  );

  useEffect(() => {
    fetchHistory(true); // Set loading on initial mount
  }, [fetchHistory]);

  const isNewThread =
    activeThreadId && !threads?.find((t) => t.id === activeThreadId);

  // Refresh when a stream finishes for a new thread
  useEffect(() => {
    if (prevIsStreaming.current && !isStreaming && isNewThread) {
      fetchHistory(false); // Don't set loading on updates
    }
    prevIsStreaming.current = isStreaming;
  }, [isStreaming, isNewThread, fetchHistory]);

  const handleDelete = async (threadIdToDelete: string) => {
    // Optimistically remove the thread from the UI
    setThreads((prevThreads) =>
      prevThreads.filter((t) => t.id !== threadIdToDelete),
    );

    try {
      await deleteChatHistory(userId, threadIdToDelete);
      // If the active chat is deleted, start a new one
      if (activeThreadId === threadIdToDelete) {
        onNewChat();
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      // Re-fetch on error to revert the change
      fetchHistory();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-[9998]"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-slate-100/95 border-r border-slate-200/80 transition-all duration-300 ease-in-out z-[9999]
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          w-80
          ${isOpen ? "w-[80%]" : ""}
          sm:w-80
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-slate-200/60 px-2 py-2 h-12 flex items-center">
            <div className="flex items-center justify-between w-full">
              <h2 className="font-semibold text-slate-900 pl-2">
                Chat History
              </h2>
              <button
                onClick={onToggle}
                className="p-1.5 hover:bg-slate-100 rounded-md transition-colors group"
                title="Close sidebar"
              >
                <PanelLeftClose className="w-5 h-5 text-slate-600 group-hover:text-slate-700" />
              </button>
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto py-2">
            {isLoading ? (
              <div className="px-4 py-8 text-center">
                <div className="text-sm text-slate-500">Loading...</div>
              </div>
            ) : threads.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="text-sm text-slate-500">
                  No conversations yet
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Start chatting to see your history
                </div>
              </div>
            ) : (
              <div className="px-2">
                {threads.map((thread, index) => (
                  <div key={thread.id} className="group">
                    <div
                      onClick={() => router.push(`?thread=${thread.id}`)}
                      className={`w-full p-3 text-left transition-colors relative cursor-pointer ${
                        activeThreadId === thread.id
                          ? "bg-slate-100"
                          : "hover:bg-slate-100"
                      } ${
                        index < threads.length - 1
                          ? "border-b border-slate-300/60"
                          : ""
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-slate-900 truncate">
                            {thread.title}
                          </h3>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {thread.lastMessage}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(thread.id);
                        }}
                        className="absolute top-2 right-0 p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-all"
                        title="Delete chat"
                      >
                        <Trash className="w-3 h-3 text-slate-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
