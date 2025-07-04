import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { PanelLeftOpen, PanelLeftClose, Trash } from "lucide-react";

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
  collapsed,
  onCollapseToggle,
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
        const response = await fetch(`/api/research/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setThreads(data);
        } else {
          console.error("Failed to fetch chat history");
          setThreads([]);
        }
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
    activeThreadId && !threads.find((t) => t.id === activeThreadId);

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
      const response = await fetch(
        `/api/research/${userId}/${threadIdToDelete}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        console.error("Failed to delete chat on server");
        // If the deletion fails, re-fetch the history to revert the change
        fetchHistory();
      } else {
        // If the active chat is deleted, start a new one
        if (activeThreadId === threadIdToDelete) {
          onNewChat();
        }
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
      // Re-fetch on error as well
      fetchHistory();
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-zinc-900/90 border-r border-zinc-800 transition-all duration-300 ease-in-out z-50
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${collapsed ? "w-20" : "w-80"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-zinc-800 px-2 py-2 h-12 flex items-center">
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onCollapseToggle}
                  className="w-8 h-8 flex items-center justify-center hover:bg-zinc-800 rounded-md transition-colors group"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="w-5 h-5 text-zinc-400 group-hover:text-zinc-300" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <h2 className="font-semibold text-zinc-100 pl-2">Research</h2>
                <button
                  onClick={onCollapseToggle}
                  className="p-1.5 hover:bg-zinc-800 rounded-md transition-colors group"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-5 h-5 text-zinc-400 group-hover:text-zinc-300" />
                </button>
              </div>
            )}
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto py-2">
            {isLoading ? (
              <div className="px-4 py-8 text-center">
                <div className="text-sm text-zinc-400">Loading...</div>
              </div>
            ) : collapsed ? (
              <></>
            ) : (
              <div className="px-2">
                {threads.map((thread, index) => (
                  <div key={thread.id} className="group">
                    <div
                      onClick={() => router.push(`?thread=${thread.id}`)}
                      className={`w-full p-3 text-left rounded-md transition-colors relative cursor-pointer ${
                        activeThreadId === thread.id
                          ? "bg-zinc-800"
                          : "hover:bg-zinc-800"
                      } ${
                        index < threads.length - 1
                          ? "border-b border-zinc-700"
                          : ""
                      }`}
                    >
                      <div className="flex items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-zinc-100 truncate">
                            {thread.title}
                          </h3>
                          <p className="text-xs text-zinc-400 truncate mt-0.5">
                            {thread.lastMessage}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(thread.id);
                        }}
                        className="absolute top-2 right-0 p-1 opacity-0 group-hover:opacity-100 hover:bg-zinc-700 rounded transition-all"
                        title="Delete chat"
                      >
                        <Trash className="w-3 h-3 text-zinc-400" />
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
