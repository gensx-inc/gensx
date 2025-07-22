"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useChat } from "@/hooks/useChat";
import { useSearchParams, useRouter } from "next/navigation";
import { getUserId } from "@/lib/userId";
import { useMapTools } from "@/hooks/useMapTools";
import { useKeyboardState } from "@/hooks/useVisualViewport";
import dynamic from "next/dynamic";
import { createToolImplementations } from "@gensx/react";
import { AppLogo } from "@/components/AppLogo";
import { InstructionsModal } from "@/components/InstructionsModal";
import { CombinedFloatingPanel } from "@/components/CombinedFloatingPanel";
import {
  addToast,
  clearAllToasts,
  ToastContainer,
} from "@/components/ui/toast";
import { toolbox } from "@/gensx/tools/toolbox";
import { ChatInput } from "@/components/ChatInput";

function ChatPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const { viewports } = useKeyboardState();
  const [isMobile, setIsMobile] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);

  // Show instructions on first visit
  useEffect(() => {
    const hasSeenInstructions = localStorage.getItem(
      "gensx-map-explorer-seen-instructions",
    );
    if (!hasSeenInstructions) {
      setShowInstructions(true);
      localStorage.setItem("gensx-map-explorer-seen-instructions", "true");
    }
  }, []);

  const handleShowInstructions = useCallback(() => {
    setShowInstructions(true);
  }, []);

  const handleCloseInstructions = useCallback(() => {
    setShowInstructions(false);
  }, []);

  const handleToggleChatHistory = useCallback(() => {
    setShowChatHistory(!showChatHistory);
  }, [showChatHistory]);

  const handleCloseChatHistory = useCallback(() => {
    setShowChatHistory(false);
  }, []);

  const {
    mapRef,
    currentView,
    markers,
    route,
    removeMarker,
    clearMarkers,
    moveMap,
    placeMarkers,
    getCurrentView,
    listMarkers,
    calculateAndShowRoute,
    clearDirections,
  } = useMapTools(userId, currentThreadId);

  const toolImplementations = useMemo(() => {
    return createToolImplementations<typeof toolbox>({
      moveMap: (params) => {
        try {
          const { latitude, longitude, zoom } = params;
          addToast({
            type: "info",
            title: "Moving map",
            description: `Moving to ${latitude}, ${longitude}`,
          });
          const result = moveMap(latitude, longitude, zoom);
          addToast({
            type: "success",
            title: "Map moved",
            description: `Successfully moved to location`,
          });
          return result;
        } catch (error) {
          addToast({
            type: "error",
            title: "Failed to move map",
            description: `Error: ${error}`,
          });
          return { success: false, message: `error: ${error}` };
        }
      },
      placeMarkers: (params) => {
        try {
          addToast({
            type: "info",
            title: "Placing markers",
            description: `Adding ${params.markers?.length || 1} marker(s)`,
          });
          const result = placeMarkers(params);
          addToast({
            type: "success",
            title: "Markers placed",
            description: `Successfully added markers to map`,
          });
          return result;
        } catch (error) {
          addToast({
            type: "error",
            title: "Failed to place markers",
            description: `Error: ${error}`,
          });
          return { success: false, message: `error: ${error}` };
        }
      },
      removeMarker: (params) => {
        try {
          const { markerId } = params;
          addToast({
            type: "info",
            title: "Removing marker",
            description: `Removing marker ${markerId}`,
          });
          const result = removeMarker(markerId);
          addToast({
            type: "success",
            title: "Marker removed",
            description: `Successfully removed marker`,
          });
          return result;
        } catch (error) {
          addToast({
            type: "error",
            title: "Failed to remove marker",
            description: `Error: ${error}`,
          });
          return { success: false, message: `error: ${error}` };
        }
      },
      clearMarkers: () => {
        try {
          addToast({
            type: "info",
            title: "Clearing markers",
            description: "Removing all markers from map",
          });
          const result = clearMarkers();
          addToast({
            type: "success",
            title: "Markers cleared",
            description: "Successfully removed all markers",
          });
          return result;
        } catch (error) {
          addToast({
            type: "error",
            title: "Failed to clear markers",
            description: `Error: ${error}`,
          });
          return { success: false, message: `error: ${error}` };
        }
      },
      getCurrentView: () => {
        try {
          const result = getCurrentView();
          addToast({
            type: "success",
            title: "Retrieved current view",
            description: "Got current map position",
          });
          return result;
        } catch (error) {
          addToast({
            type: "error",
            title: "Failed to get current view",
            description: `Error: ${error}`,
          });
          return { latitude: 0, longitude: 0, zoom: 1 };
        }
      },
      listMarkers: () => {
        try {
          const result = listMarkers();
          addToast({
            type: "success",
            title: "Listed markers",
            description: `Found ${Array.isArray(result) ? result.length : 0} markers`,
          });
          return result;
        } catch (error) {
          addToast({
            type: "error",
            title: "Failed to list markers",
            description: `Error: ${error}`,
          });
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

          addToast({
            type: "info",
            title: "Getting location",
            description: "Requesting your current location...",
          });

          return new Promise((resolve) => {
            if (!navigator.geolocation) {
              addToast({
                type: "error",
                title: "Location not supported",
                description: "Geolocation is not supported by this browser",
              });
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
                addToast({
                  type: "success",
                  title: "Location found",
                  description: "Successfully retrieved your location",
                });
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
                addToast({
                  type: "error",
                  title: "Location failed",
                  description: errorMessage,
                });
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
          addToast({
            type: "error",
            title: "Location error",
            description: `Error: ${error}`,
          });
          return { success: false, message: `error: ${error}` };
        }
      },
      calculateAndShowRoute: async (params) => {
        try {
          return await calculateAndShowRoute(params);
        } catch (error) {
          return { success: false, message: `error: ${error}` };
        }
      },
      clearDirections: () => {
        try {
          return clearDirections();
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
    calculateAndShowRoute,
    clearDirections,
  ]);

  // Handle server-side tool calls and show toasts
  const handleToolCall = useCallback((toolName: string, args: unknown) => {
    switch (toolName) {
      case "locationSearch":
        const locationSearchArgs = args as {
          query: string;
          country?: string;
        };
        addToast({
          type: "info",
          title: "Searching locations",
          description: `Searching for: ${locationSearchArgs.query}`,
        });
        break;
      case "webSearch":
        const searchArgs = args as { query: string; country?: string };
        addToast({
          type: "info",
          title: "Searching web",
          description: `Searching for: ${searchArgs.query}`,
        });
        break;
      case "geocode":
        const geocodeArgs = args as {
          query?: string;
          street?: string;
          city?: string;
        };
        const location =
          geocodeArgs.query ||
          geocodeArgs.city ||
          geocodeArgs.street ||
          "location";
        addToast({
          type: "info",
          title: "Geocoding location",
          description: `Looking up: ${location}`,
        });
        break;
      case "reverseGeocode":
        const reverseArgs = args as { latitude: number; longitude: number };
        addToast({
          type: "info",
          title: "Reverse geocoding",
          description: `Looking up coordinates: ${reverseArgs.latitude}, ${reverseArgs.longitude}`,
        });
        break;
    }
  }, []);

  const { sendMessage, status, error, clear, messages } = useChat(
    toolImplementations,
    handleToolCall,
  );

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

  // Handle thread switching
  useEffect(() => {
    if (!userId) return;

    if (threadId !== currentThreadId) {
      setCurrentThreadId(threadId);
      if (!threadId) {
        clear();
      }
    }
  }, [threadId, currentThreadId, userId, clear]);

  // Send message: create thread ID if needed, update URL, then send
  const handleSendMessage = useCallback(
    async (content: string) => {
      // Clear previous toasts when sending a new message
      clearAllToasts();

      if (!content.trim() || !userId) return;

      let currentThreadId = threadId;
      if (!currentThreadId) {
        currentThreadId = Date.now().toString();
        router.push(`?thread=${currentThreadId}`);
      }

      // Show chat history automatically after sending a message
      if (!showChatHistory) {
        setShowChatHistory(true);
      }

      await sendMessage(content.trim(), currentThreadId, userId);
    },
    [threadId, userId, router, sendMessage, showChatHistory],
  );

  const handleExampleClick = useCallback(
    (example: string) => {
      // Trigger the chat input with the selected example
      handleSendMessage(example);
    },
    [handleSendMessage],
  );

  // Show error toast when there's an error
  useEffect(() => {
    if (error) {
      addToast({
        type: "error",
        title: "Request failed",
        description: error,
      });
    }
  }, [error]);

  return (
    <div className="flex viewport-height bg-slate-50 overflow-hidden">
      {/* App Logo */}
      <AppLogo
        onHelpClick={handleShowInstructions}
        onChatToggle={handleToggleChatHistory}
        showChatHistory={showChatHistory}
      />

      {/* Instructions Modal */}
      <InstructionsModal
        isOpen={showInstructions}
        onClose={handleCloseInstructions}
        onExampleClick={handleExampleClick}
      />

      {/* Combined Floating Panel */}
      <CombinedFloatingPanel
        messages={messages}
        route={route}
        isVisible={showChatHistory}
        onClose={handleCloseChatHistory}
      />

      {/* Show loading state until userId is initialized */}
      {!userId ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <div className="relative w-full h-full">
          {/* Full-screen Map */}
          <div className="absolute inset-0 w-full h-full">
            <Map
              ref={mapRef}
              markers={markers}
              view={currentView}
              route={route}
            />
          </div>

          {/* Floating Chat Bar - Glass Morphism */}
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] w-full max-w-md px-4 pointer-events-none">
            <div className="relative rounded-2xl overflow-hidden shadow-[0_8px_8px_rgba(0,0,0,0.25),0_0_25px_rgba(0,0,0,0.15)] transition-all duration-400 ease-out backdrop-blur-[6px] bg-white/25 border border-white/40 pointer-events-auto">
              <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl shadow-[inset_2px_2px_3px_0_rgba(255,255,255,0.6),inset_-2px_-2px_3px_1px_rgba(255,255,255,0.3),inset_0_0_0_1px_rgba(255,255,255,0.2)]" />
              <div className="relative z-[2] p-2">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  disabled={status !== "completed"}
                  isCentered={false}
                  autoFocus={!isMobile}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <ToastContainer />
    </div>
  );
}

export default function ChatPage() {
  return <ChatPageContent />;
}
