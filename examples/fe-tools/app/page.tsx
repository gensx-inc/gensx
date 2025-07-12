"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { ChatMessage } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { useChat } from "@/hooks/useChat";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { getUserId } from "@/lib/userId";
import { useMapTools } from "@/hooks/useMapTools";
import dynamic from "next/dynamic";
import { createToolImplementations } from "@gensx/react";
import { toolbox } from "@/gensx/tools/frontendTools";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
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
                console.log("Location retrieved successfully", position);
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
  const { sendMessage, messages, status, error, clear, loadHistory } =
    useChat(toolImplementations);

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
    clearMarkers();
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-white">
      {/* Show loading state until userId is initialized */}
      {!userId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {/* Chat Header - now always at the top */}
          <div className="border-b border-slate-200/60 px-2 py-2 h-12 flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
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

          {/* Main Content Area */}
          <div
            className={
              // Responsive: stack vertically on mobile, side-by-side on desktop
              `flex flex-col lg:flex-row flex-1 min-h-0 transition-all duration-300 ease-in-out`
            }
          >
            {/* Map Section */}
            <div className="w-full lg:w-1/2 min-h-[250px] lg:min-h-0 h-72 lg:h-auto border-b lg:border-b-0 lg:border-r border-slate-200 flex-shrink-0">
              <Map ref={mapRef} markers={markers} view={currentView} />
            </div>

            {/* Chat Section */}
            <div className="flex flex-col flex-1 w-full lg:w-1/2 min-h-0">
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
                  <div className="flex-1 overflow-y-auto px-4 py-6 min-h-0">
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
          </div>
        </>
      )}
    </div>
  );
}
