import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PanelLeftOpen, PanelLeftClose } from "lucide-react";

interface ChatHistoryProps {
  isOpen: boolean;
  onToggle: () => void;
  collapsed: boolean;
  onCollapseToggle: () => void;
  activeThreadId: string | null;
  onNewChat: () => void;
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
}: ChatHistoryProps) {
  const router = useRouter();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/conversations");
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
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleDelete = async (threadIdToDelete: string) => {
    // Optimistically remove the thread from the UI
    setThreads((prevThreads) =>
      prevThreads.filter((t) => t.id !== threadIdToDelete),
    );

    try {
      const response = await fetch(`/api/conversation/${threadIdToDelete}`, {
        method: "DELETE",
      });

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
        className={`fixed top-0 left-0 h-full  border-r border-slate-200/60 transition-all duration-300 ease-in-out z-50
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          ${collapsed ? "w-20" : "w-80"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-slate-200/60 px-4 py-4 flex items-center">
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <button
                  onClick={onCollapseToggle}
                  className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-md transition-colors group"
                  title="Expand sidebar"
                >
                  <PanelLeftOpen className="w-5 h-5 text-slate-600 group-hover:text-slate-700" />
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between w-full">
                <h2 className="font-semibold text-slate-900">Chat History</h2>
                <button
                  onClick={onCollapseToggle}
                  className="p-1.5 hover:bg-slate-100 rounded-md transition-colors group"
                  title="Collapse sidebar"
                >
                  <PanelLeftClose className="w-5 h-5 text-slate-600 group-hover:text-slate-700" />
                </button>
              </div>
            )}
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto py-2">
            {isLoading ? (
              <div className="px-4 py-8 text-center">
                <div className="text-sm text-slate-500">Loading...</div>
              </div>
            ) : collapsed ? (
              <></>
            ) : (
              <div className="space-y-1 px-2">
                {threads.map((thread) => (
                  <div key={thread.id} className="group">
                    <div
                      onClick={() => router.push(`?thread=${thread.id}`)}
                      className={`w-full p-3 text-left rounded-md transition-colors relative cursor-pointer ${
                        activeThreadId === thread.id
                          ? "bg-slate-100"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                            activeThreadId === thread.id
                              ? "bg-slate-400"
                              : "bg-slate-300"
                          }`}
                        />
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
                        className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded transition-all"
                        title="Delete chat"
                      >
                        <svg
                          className="w-3 h-3 text-slate-500"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
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
