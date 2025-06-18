import { Card, CardContent } from "@/components/ui/card";
import { type ModelStreamState } from "@/gensx/workflows";
import { useEffect, useRef, useState } from "react";

interface ModelStreamCardProps {
  modelStream: ModelStreamState;
  isSelected?: boolean;
  onSelect?: () => void;
  scrollPosition: number;
  onScrollUpdate: (scrollTop: number) => void;
  maxWordCount?: number;
  maxGenerationTime?: number;
}

export function ModelStreamCard({
  modelStream,
  isSelected = false,
  onSelect,
  scrollPosition,
  onScrollUpdate,
  maxWordCount,
  maxGenerationTime,
}: ModelStreamCardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const isAutoScrollingRef = useRef(false);
  const isSyncingScrollRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  // Track live elapsed time during generation
  useEffect(() => {
    if (modelStream.status === "generating" && modelStream.startTime) {
      const interval = setInterval(() => {
        const elapsed = (Date.now() - modelStream.startTime!) / 1000;
        setElapsedTime(elapsed);
      }, 100); // Update every 100ms for smooth display

      return () => {
        clearInterval(interval);
      };
    }
  }, [modelStream.status, modelStream.startTime]);

  // Apply scroll position whenever it changes (from other cards)
  useEffect(() => {
    if (
      scrollContainerRef.current &&
      modelStream.status !== "generating" &&
      !isSyncingScrollRef.current // Don't sync if we're already syncing
    ) {
      // Set flag to prevent feedback loop
      isSyncingScrollRef.current = true;

      // Immediately update scroll position for smooth sync
      scrollContainerRef.current.scrollTop = scrollPosition;

      // Reset flag quickly
      requestAnimationFrame(() => {
        isSyncingScrollRef.current = false;
      });
    }
  }, [scrollPosition, modelStream.status]);

  // Auto-scroll to bottom when new content is generated
  useEffect(() => {
    if (!scrollContainerRef.current || modelStream.status !== "generating") {
      return;
    }

    const scrollElement = scrollContainerRef.current;

    // Function to scroll to bottom
    const scrollToBottom = () => {
      isAutoScrollingRef.current = true;
      scrollElement.scrollTop = scrollElement.scrollHeight;
      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 50);
    };

    // Create MutationObserver to watch for content changes
    const observer = new MutationObserver((mutations) => {
      // Check if any mutations actually added content
      const hasContentChanges = mutations.some(
        (mutation) =>
          mutation.type === "childList" || mutation.type === "characterData",
      );

      if (hasContentChanges) {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          scrollToBottom();
        });
      }
    });

    // Start observing the scroll container for changes
    observer.observe(scrollElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Initial scroll
    scrollToBottom();

    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, [modelStream.status, modelStream.modelId]);

  // Reset when generation starts
  useEffect(() => {
    if (modelStream.status === "generating") {
      // Reset scroll position when starting new generation
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [modelStream.status]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Skip if we're auto-scrolling or syncing
    if (isAutoScrollingRef.current || isSyncingScrollRef.current) return;

    const target = e.currentTarget;

    // Only sync scroll position if not generating
    if (modelStream.status !== "generating") {
      // Cancel any pending animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Use requestAnimationFrame for smooth 60fps updates
      animationFrameRef.current = requestAnimationFrame(() => {
        onScrollUpdate(target.scrollTop);
        animationFrameRef.current = null;
      });
    }
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "generating":
        return "text-blue-600";
      case "complete":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  // Calculate progress percentage relative to the max word count
  const progressPercentage = maxWordCount
    ? (modelStream.wordCount / maxWordCount) * 100
    : 0;

  // Calculate time progress percentage relative to the max generation time
  // Use either final generation time or current elapsed time
  const displayTime = modelStream.generationTime ?? elapsedTime;
  const timeProgressPercentage =
    maxGenerationTime && displayTime
      ? (displayTime / maxGenerationTime) * 100
      : 0;

  return (
    <div className="h-full w-full flex flex-col gap-2">
      {/* Floating header */}
      <div className="flex items-center justify-between px-1 flex-shrink-0">
        <h3 className="text-sm font-medium text-[#333333]">
          {modelStream.displayName}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${getStatusColor(modelStream.status)}`}>
            {modelStream.status.charAt(0).toUpperCase() +
              modelStream.status.slice(1)}
            {modelStream.status === "generating" && " ●"}
          </span>
          {isSelected && <span className="text-blue-600 text-base">✓</span>}
        </div>
      </div>

      {/* Content Card */}
      <Card
        className={`flex-1 min-h-0 cursor-pointer transition-all duration-200 backdrop-blur-md bg-white/20 border border-white/30 ${
          isSelected
            ? "ring-2 ring-blue-500 border-blue-300"
            : "hover:border-gray-400"
        }`}
        onClick={onSelect}
        liquidGlass={false} // Disable glass effect to simplify scrolling
      >
        <CardContent className="h-full p-0 overflow-hidden rounded-2xl">
          <div
            ref={scrollContainerRef}
            className="h-full p-3 overflow-y-auto rounded-2xl"
            onScroll={handleScroll}
          >
            {modelStream.content ? (
              <div className="text-sm whitespace-pre-wrap text-[#333333] leading-relaxed">
                {modelStream.content}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-[#333333]/60 text-sm">
                {modelStream.status === "generating"
                  ? "Generating content..."
                  : modelStream.status === "error" && modelStream.error
                    ? modelStream.error
                    : "No content yet"}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Word count and time progress bars */}
      <div className="px-1 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          {(modelStream.generationTime !== undefined ||
            (modelStream.status === "generating" && elapsedTime > 0)) && (
            <span className="text-xs text-[#333333]/60">
              {displayTime.toFixed(1)}s
            </span>
          )}
          <span className="text-xs text-[#333333]/60">
            {modelStream.wordCount} words
          </span>
        </div>
        <div className="relative h-1.5">
          {/* Time bar - left to right, max 50% */}
          {(modelStream.generationTime !== undefined ||
            (modelStream.status === "generating" && elapsedTime > 0)) && (
            <div
              className="absolute left-0 h-full bg-gradient-to-r from-[#014071b6] to-[#0359734f] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(timeProgressPercentage / 2, 50)}%` }}
            />
          )}
          {/* Word count bar - right to left, max 50% */}
          <div
            className="absolute right-0 h-full bg-gradient-to-l from-[#014071b6] to-[#0359734f] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progressPercentage / 2, 50)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
