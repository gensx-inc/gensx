"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ChatHistory } from "@/components/ChatHistory";
import { useChat } from "@/hooks/useChat";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Menu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getUserId } from "@/lib/userId";
import { useMapTools } from "@/hooks/useMapTools";
import { useKeyboardState } from "@/hooks/useVisualViewport";
import dynamic from "next/dynamic";
import { createToolImplementations, useEvents } from "@gensx/react";
import { toolbox } from "@/gensx/tools/toolbox";
import { getThreadSummary } from "@/lib/actions/chat-history";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [threadTitle, setThreadTitle] = useState<string | null>(null);
  const { isKeyboardOpen, viewports } = useKeyboardState();
  const [isMobile, setIsMobile] = useState(false);
  const {
    mapRef,
    currentView,
    markers,
    removeMarker,
    clearMarkers,
    moveMap,
    placeMarkers,
    getCurrentView,
    listMarkers,
  } = useMapTools(userId, currentThreadId);

  const toolImplementations = useMemo(() => {
    return createToolImplementations<typeof toolbox>({
      moveMap: (params) => {
        try {
          const { latitude, longitude, zoom } = params;
          return moveMap(latitude, longitude, zoom);
        } catch (error) {
          return { success: false, message: `error: ${error}` };
        }
      },
      placeMarkers: (params) => {
        try {
          return placeMarkers(params);
        } catch (error) {
          return { success: false, message: `error: ${error}` };
        }
      },
      removeMarker: (params) => {
        try {
          const { markerId } = params;
          return removeMarker(markerId);
        } catch (error) {
          return { success: false, message: `error: ${error}` };
        }
      },
      clearMarkers: () => {
        try {
          return clearMarkers();
        } catch (error) {
          return { success: false, message: `error: ${error}` };
        }
      },
      getCurrentView: async () => {
        return getCurrentView();
      },
      listMarkers: () => {
        try {
          return listMarkers();
        } catch (error) {
          return { success: false, message: `error: ${error}` };
        }
      },
      getUserLocation: async (params) => {
        try {
          const {
            enableHighAccuracy = false,
            timeout = 10000,
            maximumAge = 60000,
          } = params;

          return new Promise((resolve) => {
            if (!navigator.geolocation) {
              resolve({
                success: false,
                message: "Geolocation is not supported by this browser",
              });
              return;
            }

            const options = {
              enableHighAccuracy,
              timeout,
              maximumAge,
            };

            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  success: true,
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  message: "Location retrieved successfully",
                });
              },
              (error) => {
                let errorMessage = "Failed to get location";
                switch (error.code) {
                  case error.PERMISSION_DENIED:
                    errorMessage = "Location permission denied";
                    break;
                  case error.POSITION_UNAVAILABLE:
                    errorMessage = "Location information unavailable";
                    break;
                  case error.TIMEOUT:
                    errorMessage = "Location request timed out";
                    break;
                }
                console.error("Error retrieving location", error);
                resolve({
                  success: false,
                  message: errorMessage,
                });
              },
              options,
            );
          });
        } catch (error) {
          return { success: false, message: `error: ${error}` };
        }
      },
    });
  }, [
    moveMap,
    placeMarkers,
    removeMarker,
    clearMarkers,
    getCurrentView,
    listMarkers,
  ]);
  const {
    sendMessage,
    messages,
    status,
    error,
    clear,
    loadHistory,
    execution,
  } = useChat(toolImplementations);

  const Map = useMemo(
    () =>
      dynamic(() => import("@/components/Map"), {
        loading: () => <p>A map is loading</p>,
        ssr: false,
      }),
    [],
  );

  // Get thread ID from URL
  const threadId = searchParams.get("thread");

  // Initialize user ID and detect mobile on client side
  useEffect(() => {
    setUserId(getUserId());
    setIsMobile(window.innerWidth < 768); // md breakpoint
  }, []);

  // Update CSS custom property when viewport changes
  useEffect(() => {
    if (viewports) {
      document.documentElement.style.setProperty(
        "--viewport-height",
        `${viewports.visualViewport.height}px`,
      );
    }
  }, [viewports]);

  // Listen for summary-generated events
  useEvents(execution, "summary-generated", (event: { summary: string }) => {
    setThreadTitle(event.summary);
  });

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
        setThreadTitle(null);
      }
    }
  }, [threadId, currentThreadId, userId, clear, loadHistory, messages.length]);

  // Auto-scroll to bottom when messages change or status changes (only if user is near bottom)
  useEffect(() => {
    if (messagesEndRef.current) {
      const messagesContainer =
        messagesEndRef.current.closest(".overflow-y-auto");
      if (messagesContainer) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100; // 100px threshold

        if (isNearBottom) {
          // Use container's scrollTop instead of scrollIntoView to avoid page-level scrolling
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
      }
    }
  }, [messages, status]);

  // Scroll to bottom when thread loads (after history is loaded)
  useEffect(() => {
    if (threadId && messages.length > 0) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        if (messagesEndRef.current) {
          const messagesContainer =
            messagesEndRef.current.closest(".overflow-y-auto");
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }
      }, 100);
    }
  }, [threadId, messages.length]);

  // Load thread title when thread changes
  useEffect(() => {
    if (!userId || !threadId) {
      setThreadTitle(null);
      return;
    }

    const loadThreadTitle = async () => {
      try {
        const title = await getThreadSummary(userId, threadId);
        setThreadTitle(title);
      } catch (error) {
        console.error("Error loading thread title:", error);
        setThreadTitle(null);
      }
    };

    loadThreadTitle();
  }, [userId, threadId]);

  // New Chat: clear messages and remove thread ID from URL
  const handleNewChat = () => {
    clear();
    clearMarkers();
    router.push("?", { scroll: false });
  };

  // Toggle sidebar open/closed
  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
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
    <div className="flex viewport-height bg-gradient-to-br from-slate-50 to-white overflow-hidden">
      {/* Show loading state until userId is initialized */}
      {!userId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {/* Chat History Sidebar */}
          <ChatHistory
            isOpen={sidebarOpen}
            onToggle={toggleSidebar}
            collapsed={false}
            onCollapseToggle={() => {}}
            activeThreadId={threadId}
            onNewChat={handleNewChat}
            userId={userId}
            isStreaming={status !== "completed"}
          />

          {/* Main Content Area */}
          <div className="flex flex-col flex-1 min-h-0">
            {/* Chat Header - Pinned to top */}
            <div className="border-b border-slate-200/60 px-2 py-2 h-12 flex items-center gap-2 justify-between flex-shrink-0 sticky top-0 bg-white z-20">
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleSidebar}
                  className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-md transition-colors"
                  title="Toggle sidebar"
                >
                  <Menu className="w-5 h-5 text-slate-600" />
                </button>
                <button
                  onClick={handleNewChat}
                  className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-md transition-colors"
                  title="New chat"
                >
                  <Plus className="w-5 h-5 text-slate-600" />
                </button>
                {threadTitle && (
                  <div className="hidden sm:flex items-center gap-2 min-w-0 flex-1">
                    <div className="h-6 border-l border-slate-300 flex-shrink-0" />
                    <h1 className="text-sm font-medium text-slate-700 truncate min-w-0">
                      {threadTitle}
                    </h1>
                  </div>
                )}
              </div>
              {/* Right-aligned links */}
              <div className="flex items-center gap-2 ml-auto mr-2 sm:mr-4 flex-shrink-0">
                <Link
                  href="https://github.com/gensx-inc/gensx"
                  passHref
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <Image
                    src="/github-mark.svg"
                    alt="GitHub"
                    className="w-6 h-6 flex-shrink-0"
                    width={24}
                    height={24}
                  />
                </Link>
                <div className="h-6 border-l border-slate-300 mx-1 sm:mx-2 flex-shrink-0" />
                <Link
                  href="https://gensx.com/docs"
                  passHref
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0"
                >
                  <Image
                    src="/logo.svg"
                    alt="Docs"
                    width={87}
                    height={35}
                    className="flex-shrink-0"
                  />
                </Link>
              </div>
            </div>

            {/* Content Area with Map and Chat */}
            <div className="flex flex-col md:flex-row flex-1 min-h-0 transition-all duration-300 ease-in-out overflow-hidden">
              {/* Single Map Component - positioned responsively */}
              <div
                className={`
                md:flex md:w-1/2 md:h-full md:border-r md:border-b-0
                ${isKeyboardOpen ? "max-md:hidden" : "flex border-b max-md:h-[40%] max-md:min-h-[250px] max-md:max-h-[350px]"}
                border-slate-200 flex-shrink-0 w-full
              `}
              >
                <div className="w-full h-full">
                  <Map ref={mapRef} markers={markers} view={currentView} />
                </div>
              </div>

              {/* Mobile and Desktop Chat Section */}
              <div className="flex flex-col flex-1 min-h-0 overflow-hidden max-w-full md:w-1/2">
                {messages.length === 0 && !threadId ? (
                  /* Empty state - Center the input in the entire remaining area */
                  <div
                    className={`flex-1 flex ${isKeyboardOpen ? "items-start pt-8" : "items-center"} justify-center px-2 sm:px-4`}
                  >
                    <div className="max-w-4xl mx-auto w-full">
                      <ChatInput
                        onSendMessage={handleSendMessage}
                        disabled={status !== "completed"}
                        isCentered={true}
                        isKeyboardOpen={isKeyboardOpen}
                        autoFocus={!isMobile}
                      />
                    </div>
                  </div>
                ) : (
                  /* Messages exist - Separate scrollable chat and fixed input */
                  <div className="flex flex-col h-full min-h-0">
                    {/* Messages Container - Independent scrollable area */}
                    <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-6 min-h-0">
                      <div className="max-w-4xl mx-auto space-y-0 w-full">
                        {/* Thread Title - Show only on mobile */}
                        {threadTitle && (
                          <div className="block sm:hidden mb-6">
                            <h1 className="text-lg font-semibold text-slate-800 text-center">
                              {threadTitle}
                            </h1>
                          </div>
                        )}
                        {messages.map((message, index) => (
                          <ChatMessage
                            key={`${threadId || "new"}-${index}`}
                            message={message}
                            messages={messages}
                            status={
                              index === messages.length - 1
                                ? status
                                : "completed"
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

                    {/* Input Area - Fixed at bottom, never scrolls */}
                    <div className="px-2 sm:px-4 pb-4 bg-gradient-to-t from-slate-50 to-transparent pt-2 flex-shrink-0 keyboard-safe-input">
                      <div className="max-w-4xl mx-auto w-full">
                        <ChatInput
                          onSendMessage={handleSendMessage}
                          disabled={status !== "completed"}
                          isCentered={false}
                          autoFocus={!isMobile}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
