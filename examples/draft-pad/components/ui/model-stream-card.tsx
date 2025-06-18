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
  const lastContentLengthRef = useRef(0);
  const userHasScrolledRef = useRef(false);
  const [elapsedTime, setElapsedTime] = useState<number>(0);

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
    if (scrollContainerRef.current && !userHasScrolledRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollPosition;
        }
      });
    }
  }, [scrollPosition]);

  // Auto-scroll to bottom when new content is generated
  useEffect(() => {
    if (scrollContainerRef.current && modelStream.content) {
      const currentLength = modelStream.content.length;
      const isNewContent = currentLength > lastContentLengthRef.current;
      const isGenerating = modelStream.status === "generating";

      if (isNewContent && isGenerating && !userHasScrolledRef.current) {
        // Scroll to bottom for new content
        scrollContainerRef.current.scrollTop =
          scrollContainerRef.current.scrollHeight;
        // Update the shared scroll position
        onScrollUpdate(scrollContainerRef.current.scrollTop);
      }

      lastContentLengthRef.current = currentLength;
    }
  }, [modelStream.content, modelStream.status, onScrollUpdate]);

  // Reset user scroll flag when generation completes
  useEffect(() => {
    if (modelStream.status !== "generating") {
      userHasScrolledRef.current = false;
    }
  }, [modelStream.status]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isAtBottom =
      Math.abs(target.scrollHeight - target.clientHeight - target.scrollTop) <
      5;

    // If user scrolls up while generating, stop auto-scroll
    if (modelStream.status === "generating" && !isAtBottom) {
      userHasScrolledRef.current = true;
    }

    onScrollUpdate(target.scrollTop);
  };

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
  const timeProgressPercentage =
    maxGenerationTime && modelStream.generationTime
      ? (modelStream.generationTime / maxGenerationTime) * 100
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
        className={`flex-1 min-h-0 cursor-pointer transition-all duration-200 ${
          isSelected
            ? "ring-2 ring-blue-500 border-blue-300"
            : "hover:border-gray-400"
        }`}
        onClick={onSelect}
      >
        <CardContent className="h-full p-0">
          <div
            ref={scrollContainerRef}
            className="h-full p-3 overflow-y-auto"
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
          <span className="text-xs text-[#333333]/60">
            {modelStream.wordCount} words
          </span>
          {modelStream.generationTime !== undefined && (
            <span className="text-xs text-[#333333]/60">
              {modelStream.generationTime.toFixed(1)}s
            </span>
          )}
        </div>
        <div className="relative h-1.5">
          {/* Word count bar - left to right, max 50% */}
          <div
            className="absolute left-0 h-full bg-gradient-to-r from-[#014071b6] to-[#0359734f] rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(progressPercentage / 2, 50)}%` }}
          />
          {/* Time bar - right to left, max 50% */}
          {modelStream.generationTime !== undefined && (
            <div
              className="absolute right-0 h-full bg-gradient-to-l from-[#014071b6] to-[#0359734f] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(timeProgressPercentage / 2, 50)}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
