import { Card, CardContent } from "@/components/ui/card";
import { type ModelConfig, type ModelStreamState } from "@/gensx/workflows";
import { calculateDiff, calculateStreamingDiff } from "@/lib/diff-utils";
import { type ContentVersion } from "@/lib/types";
import {
  Check,
  Clock,
  DollarSign,
  TrendingDown,
  TrendingUp,
  WholeWord,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DiffDisplay } from "./diff-display";
import { LiveCostDisplay } from "./live-cost-display";
import { ProviderIcon } from "./provider-icon";

interface MetricRanges {
  minWordCount: number;
  maxWordCount: number;
  minTime: number;
  maxTime: number;
  minCost: number;
  maxCost: number;
}

interface ModelStreamCardProps {
  modelStream: ModelStreamState;
  modelConfig?: ModelConfig;
  isSelected?: boolean;
  onSelect?: () => void;
  scrollPosition?: number;
  onScrollUpdate?: (scrollTop: number) => void;
  metricRanges?: MetricRanges;
  previousVersion?: ContentVersion;
  showDiff?: boolean;
}

export function ModelStreamCard({
  modelStream,
  modelConfig,
  isSelected = false,
  onSelect,
  scrollPosition,
  onScrollUpdate,
  metricRanges,
  previousVersion,
  showDiff = false,
}: ModelStreamCardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const isAutoScrollingRef = useRef(false);
  const isSyncingScrollRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

  // Calculate current cost for this model
  const currentCost = useMemo(() => {
    if (!modelConfig?.cost) return null;

    const inputTokens = modelStream.inputTokens ?? 500;
    const outputTokens =
      modelStream.outputTokens ?? Math.ceil(modelStream.charCount / 4);

    const inputCost = (inputTokens / 1_000_000) * modelConfig.cost.input;
    const outputCost = (outputTokens / 1_000_000) * modelConfig.cost.output;
    const totalCost = inputCost + outputCost;
    // Convert to cost per 1000 requests
    return totalCost * 1000;
  }, [modelStream, modelConfig]);

  // Determine if this model has the highest/lowest metrics
  const isHighestWords =
    metricRanges &&
    modelStream.wordCount > 0 &&
    modelStream.wordCount === metricRanges.maxWordCount;
  const isLowestWords =
    metricRanges &&
    modelStream.wordCount > 0 &&
    modelStream.wordCount === metricRanges.minWordCount;

  const isHighestTime =
    metricRanges &&
    modelStream.generationTime !== undefined &&
    modelStream.generationTime === metricRanges.maxTime;
  const isLowestTime =
    metricRanges &&
    modelStream.generationTime !== undefined &&
    modelStream.generationTime === metricRanges.minTime;

  const isHighestCost =
    metricRanges &&
    currentCost !== null &&
    Math.abs(currentCost - metricRanges.maxCost) < 0.0001;
  const isLowestCost =
    metricRanges &&
    currentCost !== null &&
    Math.abs(currentCost - metricRanges.minCost) < 0.0001;

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
      !isSyncingScrollRef.current && // Don't sync if we're already syncing
      scrollPosition !== undefined // Only sync if scrollPosition is provided
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

    // Only sync scroll position if not generating and onScrollUpdate is provided
    if (modelStream.status !== "generating" && onScrollUpdate) {
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

  // Use either final generation time or current elapsed time
  const displayTime = modelStream.generationTime ?? elapsedTime;

  // Calculate diff segments
  const diffSegments = useMemo(() => {
    if (!showDiff || !previousVersion || !modelStream.content) {
      return null;
    }

    if (modelStream.status === "generating") {
      return calculateStreamingDiff(
        previousVersion.content,
        modelStream.content,
      );
    } else {
      return calculateDiff(previousVersion.content, modelStream.content);
    }
  }, [showDiff, previousVersion, modelStream.content, modelStream.status]);

  return (
    <motion.div className="h-full w-full flex flex-col gap-2">
      {/* Floating header */}
      <div className="flex items-center justify-between px-1 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <ProviderIcon
            provider={modelConfig?.provider ?? "openai"}
            className="w-4 h-4"
          />
          <h3 className="text-sm font-medium text-[#333333]">
            {modelStream.displayName.replace(/\s*\([^)]*\)\s*$/, "")}
          </h3>
          {modelStream.status === "complete" && (
            <Check className="w-4 h-4 text-green-600" />
          )}
          {modelStream.status === "generating" && (
            <div className="flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
              <span className="text-xs text-blue-600">Generating</span>
            </div>
          )}
          {modelStream.status === "error" && (
            <div className="flex items-center gap-1">
              <span className="text-xs">❌</span>
              <span className="text-xs text-red-600">Error</span>
            </div>
          )}
          {modelStream.status === "idle" && (
            <div className="flex items-center gap-1">
              <span className="text-xs">⏳</span>
              <span className="text-xs text-[#333333]/60">Waiting</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {/* Word count badge */}
          <div
            className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
              isHighestWords || isLowestWords
                ? "bg-[#000000]/20 ring-2 ring-[#000000]/20"
                : "bg-[#000000]/10"
            }`}
          >
            <WholeWord className="w-4 h-4 text-[#000000]/60" />
            <span className="text-xs text-[#000000]/80">
              {modelStream.wordCount}
            </span>
            {isHighestWords && (
              <TrendingUp className="w-3 h-3 text-[#000000]/60" />
            )}
            {isLowestWords && (
              <TrendingDown className="w-3 h-3 text-[#000000]/60" />
            )}
          </div>

          {/* Time badge */}
          {(modelStream.generationTime !== undefined ||
            (modelStream.status === "generating" && elapsedTime > 0)) && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                isHighestTime || isLowestTime
                  ? "bg-[#000000]/20 ring-2 ring-[#000000]/20"
                  : "bg-[#000000]/10"
              }`}
            >
              <Clock className="w-3 h-3 text-[#000000]/60" />
              <span className="text-xs text-[#000000]/80">
                {displayTime.toFixed(1)}s
              </span>
              {isHighestTime && (
                <TrendingUp className="w-3 h-3 text-[#000000]/60" />
              )}
              {isLowestTime && (
                <TrendingDown className="w-3 h-3 text-[#000000]/60" />
              )}
            </div>
          )}

          {/* Cost badge */}
          {modelConfig?.cost && (
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full ${
                isHighestCost || isLowestCost
                  ? "bg-[#000000]/20 ring-2 ring-[#000000]/20"
                  : "bg-[#000000]/10"
              }`}
            >
              <DollarSign className="w-3 h-3 text-[#000000]/60" />
              <LiveCostDisplay
                modelStream={modelStream}
                modelConfig={modelConfig}
                className="text-xs text-[#000000]"
                showIcon={false}
              />
              {isHighestCost && (
                <TrendingUp className="w-3 h-3 text-[#000000]/60" />
              )}
              {isLowestCost && (
                <TrendingDown className="w-3 h-3 text-[#000000]/60" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Card */}
      <Card
        className={`flex-1 min-h-0 cursor-pointer transition-all duration-200 backdrop-blur-md bg-white/40 border border-white/30 ${
          isSelected ? "" : "hover:border-gray-400"
        } ${modelStream.status === "generating" ? "animate-pulse" : ""} relative`}
        onClick={onSelect}
        liquidGlass={false} // Disable glass effect to simplify scrolling
      >
        <CardContent className="h-full p-0 overflow-hidden rounded-2xl">
          <div
            ref={scrollContainerRef}
            className="h-full p-3 overflow-y-auto rounded-2xl relative"
            onScroll={handleScroll}
          >
            {modelStream.content ? (
              diffSegments && showDiff ? (
                <DiffDisplay
                  segments={diffSegments}
                  isStreaming={modelStream.status === "generating"}
                  className="whitespace-pre-wrap"
                />
              ) : (
                <div className="text-sm whitespace-pre-wrap text-[#333333] leading-relaxed">
                  {modelStream.content}
                </div>
              )
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
    </motion.div>
  );
}
