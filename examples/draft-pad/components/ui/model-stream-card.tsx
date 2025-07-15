import { Card, CardContent } from "@/components/ui/card";
import { type ModelConfig, type ModelStreamState } from "@/gensx/workflows";
import { calculateDiff, calculateStreamingDiff } from "@/lib/diff-utils";
import { type ContentVersion } from "@/lib/types";
import { Check, Clock, Copy, DollarSign, WholeWord, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
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
  minTokensPerSecond: number;
  maxTokensPerSecond: number;
}

interface ModelStreamCardProps {
  modelStream: ModelStreamState;
  modelConfig?: ModelConfig;
  isSelected?: boolean;
  onSelect?: () => void;
  scrollPosition?: number;
  onScrollUpdate?: (scrollTop: number) => void;
  metricRanges?: MetricRanges | null;
  previousVersion?: ContentVersion;
  showDiff?: boolean;
  autoShowDiff?: boolean;
  totalStreams?: number;
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
  autoShowDiff = false,
  totalStreams = 1,
}: ModelStreamCardProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const isAutoScrollingRef = useRef(false);
  const isSyncingScrollRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);
  const [showCompletionFlash, setShowCompletionFlash] = useState(false);
  const previousStatusRef = useRef<string | null>(null);
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);

  // Determine if selection should be shown (only when there are multiple streams)
  const showSelection = totalStreams > 1;

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

  // Calculate tokens per second
  const tokensPerSecond = useMemo(() => {
    const effectiveTime =
      modelStream.generationTime ??
      (modelStream.status === "generating" && modelStream.startTime
        ? (Date.now() - modelStream.startTime) / 1000
        : null);

    if (!effectiveTime || effectiveTime <= 0) return null;

    const outputTokens =
      modelStream.outputTokens ?? Math.ceil(modelStream.charCount / 4);
    return outputTokens / effectiveTime;
  }, [
    modelStream.generationTime,
    modelStream.outputTokens,
    modelStream.charCount,
    modelStream.status,
    modelStream.startTime,
    elapsedTime,
  ]);

  // Use either final generation time or current elapsed time
  const displayTime = modelStream.generationTime ?? elapsedTime;

  // Calculate diff segments
  const diffSegments = useMemo(() => {
    const shouldCalculate =
      (showDiff || autoShowDiff) && previousVersion && modelStream.content;

    if (!shouldCalculate) {
      return null;
    }

    // Extract content from previousVersion's selected model
    let previousContent: string | null = null;

    // The previous version should have a selected model that was used as the base for this generation
    if (previousVersion.selectedModelId) {
      const selectedResponse = previousVersion.modelResponses.find(
        (r) => r.modelId === previousVersion.selectedModelId,
      );
      previousContent = selectedResponse?.content ?? null;
    }

    if (!previousContent) {
      return null;
    }

    if (modelStream.status === "generating") {
      return calculateStreamingDiff(previousContent, modelStream.content);
    } else {
      return calculateDiff(previousContent, modelStream.content);
    }
  }, [
    showDiff,
    autoShowDiff,
    previousVersion,
    modelStream.content,
    modelStream.status,
  ]);

  // Check if this model has highest/lowest metrics
  const isHighestTime = metricRanges
    ? displayTime === metricRanges.maxTime
    : false;
  const isLowestTime = metricRanges
    ? displayTime === metricRanges.minTime
    : false;
  const _isHighestWords = metricRanges
    ? modelStream.wordCount === metricRanges.maxWordCount
    : false;
  const _isLowestWords = metricRanges
    ? modelStream.wordCount === metricRanges.minWordCount
    : false;
  const isHighestCost = metricRanges
    ? currentCost === metricRanges.maxCost
    : false;
  const isLowestCost = metricRanges
    ? currentCost === metricRanges.minCost
    : false;
  const isHighestTokensPerSecond = metricRanges
    ? tokensPerSecond === metricRanges.maxTokensPerSecond
    : false;
  const isLowestTokensPerSecond = metricRanges
    ? tokensPerSecond === metricRanges.minTokensPerSecond
    : false;

  // Helper function to get badge style based on metric level
  // For word count: high = good (green), low = bad (red)
  // For time/cost: high = bad (red), low = good (green)
  const getBadgeStyle = (
    isHigh: boolean,
    isLow: boolean,
    isGoodWhenHigh = true,
    hasMultipleModels = true,
  ) => {
    // If only one model, always use neutral styling
    if (!hasMultipleModels) {
      return {
        containerClass: "px-2.5 py-0.5 min-w-0 flex-shrink-0",
        bgClass: "",
        textClass: "text-xs font-medium text-[#000000]/70 whitespace-nowrap",
        iconClass: "w-3.5 h-3.5 text-[#000000]/60 flex-shrink-0",
        wrapperClass: "",
      };
    }

    const isGood = isGoodWhenHigh ? isHigh : isLow;
    const isBad = isGoodWhenHigh ? isLow : isHigh;

    if (isGood) {
      return {
        containerClass: "px-2.5 py-0.5 min-w-0 flex-shrink-0", // Same size
        bgClass: "bg-green-100/40 rounded-full", // More transparent green background
        textClass: "text-xs font-semibold text-green-700 whitespace-nowrap",
        iconClass: "w-3.5 h-3.5 text-green-700 flex-shrink-0",
        wrapperClass: "", // No extra margin needed
      };
    } else if (isBad) {
      return {
        containerClass: "px-2.5 py-0.5 min-w-0 flex-shrink-0", // Same size
        bgClass: "bg-red-100/40 rounded-full", // More transparent red background
        textClass: "text-xs font-semibold text-red-700 whitespace-nowrap",
        iconClass: "w-3.5 h-3.5 text-red-700 flex-shrink-0",
        wrapperClass: "", // No extra margin needed
      };
    } else {
      return {
        containerClass: "px-2.5 py-0.5 min-w-0 flex-shrink-0", // Same size
        bgClass: "", // No background
        textClass: "text-xs font-medium text-[#000000]/70 whitespace-nowrap",
        iconClass: "w-3.5 h-3.5 text-[#000000]/60 flex-shrink-0",
        wrapperClass: "", // No extra margin needed
      };
    }
  };

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

  // Show completion flash when status changes to complete
  useEffect(() => {
    // Only show flash when transitioning from generating to complete
    if (
      modelStream.status === "complete" &&
      previousStatusRef.current === "generating"
    ) {
      setShowCompletionFlash(true);
      const timer = setTimeout(() => {
        setShowCompletionFlash(false);
      }, 600); // Flash for 0.6 seconds

      // Scroll to top of this card's content when it completes
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }

      return () => {
        clearTimeout(timer);
      };
    }

    // Update the previous status ref
    previousStatusRef.current = modelStream.status;
  }, [modelStream.status]);

  // Additional effect to ensure scroll happens on any completion
  useEffect(() => {
    if (
      modelStream.status === "complete" &&
      modelStream.content &&
      scrollContainerRef.current
    ) {
      // Small delay to ensure content is fully rendered
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [modelStream.status, modelStream.content]);

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

  return (
    <motion.div className="h-full w-full flex flex-col pt-0.5 px-0.5">
      {/* Outer container that wraps everything */}
      <div className="flex-1 min-h-0 rounded-2xl bg-white/40 backdrop-blur-sm pb-1 flex flex-col gap-0 relative">
        {/* Glass effect border */}
        <div className="absolute inset-0 z-[1] overflow-hidden rounded-2xl shadow-[inset_1px_1px_1px_0_rgba(255,255,255,0.4),inset_-1px_-1px_1px_1px_rgba(255,255,255,0.4)] pointer-events-none" />

        {/* Content Card */}
        <motion.div
          className="flex-1 min-h-0 mt-1 mx-1 mb-1 relative z-[2]"
          animate={{
            scale: showCompletionFlash ? 1.02 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            duration: 0.2,
          }}
        >
          <Card
            className={`h-full cursor-pointer transition-all duration-200 backdrop-blur-md ${
              modelStream.status === "generating"
                ? "border-2 border-blue-500 animate-pulse"
                : showCompletionFlash
                  ? "border-2 border-green-500"
                  : isSelected &&
                      showSelection &&
                      modelStream.status === "complete"
                    ? "border-2 border-blue-500"
                    : "border border-white/30"
            } ${
              isSelected || !showSelection ? "" : "hover:border-gray-400"
            } relative rounded-2xl overflow-hidden`}
            onClick={showSelection ? onSelect : undefined}
            liquidGlass={false} // Disable glass effect to simplify scrolling
          >
            {/* Green completion overlay */}
            <AnimatePresence>
              {showCompletionFlash && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute inset-0 bg-green-500/10 pointer-events-none"
                />
              )}
            </AnimatePresence>

            {/* Selected indicator - only show when there are multiple streams */}
            {isSelected &&
              showSelection &&
              modelStream.status === "complete" && (
                <div className="absolute top-3 right-3 z-10">
                  <div className="bg-blue-500 text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Selected
                  </div>
                </div>
              )}
            <CardContent className="h-full p-0 overflow-hidden rounded-2xl relative">
              <div
                ref={scrollContainerRef}
                className="h-full p-3 overflow-y-auto rounded-2xl relative"
                onScroll={handleScroll}
              >
                {/* Floating copy button only */}
                <div className="sticky top-0 right-0 z-10 float-right mb-1">
                  {/* Copy button */}
                  {modelStream.content && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigator.clipboard.writeText(modelStream.content);
                        setShowCopyFeedback(true);
                        setTimeout(() => {
                          setShowCopyFeedback(false);
                        }, 2000);
                      }}
                      className="flex items-center justify-center w-7 h-7 rounded-full bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-all duration-200"
                      title={showCopyFeedback ? "Copied!" : "Copy content"}
                    >
                      {showCopyFeedback ? (
                        <Check className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-[#333333]/70" />
                      )}
                    </button>
                  )}
                </div>

                {modelStream.content ? (
                  diffSegments && (showDiff || autoShowDiff) ? (
                    <DiffDisplay
                      segments={diffSegments}
                      isStreaming={modelStream.status === "generating"}
                      className="whitespace-pre-wrap"
                      showDiff={showDiff}
                      autoShowDiff={autoShowDiff}
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

              {/* Sticky generating indicator at bottom */}
              {modelStream.status === "generating" && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white/80 to-transparent backdrop-blur-sm px-3 py-2 pointer-events-none">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                    <span className="text-sm font-medium text-blue-600">
                      Generating...
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Header badges directly in container */}
        <div className="flex items-center justify-between px-3 py-1 flex-shrink-0 relative z-[2]">
          <div className="flex items-center gap-1.5">
            {/* Model name badge with provider icon and status */}
            <div className="flex items-center gap-1.5">
              <ProviderIcon
                provider={modelConfig?.provider ?? "openai"}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-[#333333] truncate max-w-[200px]">
                {modelStream.displayName.replace(/\s*\([^)]*\)\s*$/, "")}
              </span>
              {/* Status indicators within the badge */}
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
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {/* Word count badge */}
            {(() => {
              const style = getBadgeStyle(
                _isHighestWords || false,
                _isLowestWords || false,
                true, // High word count is good
                !!metricRanges, // Has multiple models if metricRanges exists
              );
              return (
                <div className={style.wrapperClass}>
                  <div
                    className={`flex items-center gap-1 ${style.containerClass} ${style.bgClass} transition-all duration-200`}
                  >
                    <WholeWord className={style.iconClass} />
                    <span className={style.textClass}>
                      {modelStream.wordCount}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Tokens per second badge */}
            {tokensPerSecond !== null &&
              (() => {
                const style = getBadgeStyle(
                  isHighestTokensPerSecond || false,
                  isLowestTokensPerSecond || false,
                  true, // High tokens per second is good
                  !!metricRanges, // Has multiple models if metricRanges exists
                );
                return (
                  <div className={style.wrapperClass}>
                    <div
                      className={`flex items-center gap-1 ${style.containerClass} ${style.bgClass} transition-all duration-200`}
                    >
                      <Zap className={style.iconClass} />
                      <span className={style.textClass}>
                        {tokensPerSecond.toFixed(0)} t/s
                      </span>
                    </div>
                  </div>
                );
              })()}

            {/* Time badge */}
            {(modelStream.generationTime !== undefined ||
              (modelStream.status === "generating" && elapsedTime > 0)) &&
              (() => {
                const style = getBadgeStyle(
                  isHighestTime || false,
                  isLowestTime || false,
                  false, // High time is bad (slower)
                  !!metricRanges, // Has multiple models if metricRanges exists
                );
                return (
                  <div className={style.wrapperClass}>
                    <div
                      className={`flex items-center gap-1 ${style.containerClass} ${style.bgClass} transition-all duration-200`}
                    >
                      <Clock className={style.iconClass} />
                      <span className={style.textClass}>
                        {displayTime.toFixed(1)}s
                      </span>
                    </div>
                  </div>
                );
              })()}

            {/* Cost badge */}
            {modelConfig?.cost &&
              (() => {
                const style = getBadgeStyle(
                  isHighestCost || false,
                  isLowestCost || false,
                  false, // High cost is bad (more expensive)
                  !!metricRanges, // Has multiple models if metricRanges exists
                );
                return (
                  <div className={style.wrapperClass}>
                    <div
                      className={`flex items-center gap-1 ${style.containerClass} ${style.bgClass} transition-all duration-200`}
                    >
                      <DollarSign className={style.iconClass} />
                      <LiveCostDisplay
                        modelStream={modelStream}
                        modelConfig={modelConfig}
                        className={style.textClass}
                        showIcon={false}
                      />
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
